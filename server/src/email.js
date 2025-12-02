const nodemailer = require('nodemailer');

// Email-Konfiguration aus Umgebungsvariablen
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true für 465, false für andere Ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Erstelle Transporter (wird lazy initialisiert)
let transporter = null;

function getTransporter() {
  if (!transporter && emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
  }
  return transporter;
}

// Prüfe ob E-Mail-Service konfiguriert ist
function isEmailEnabled() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Sende E-Mail (mit Fehlerbehandlung)
async function sendEmail({ to, subject, text, html }) {
  if (!isEmailEnabled()) {
    console.log('[EMAIL] E-Mail-Service nicht konfiguriert. E-Mail würde gesendet werden an:', to);
    console.log('[EMAIL] Betreff:', subject);
    console.log('[EMAIL] Text:', text);
    return { success: false, message: 'E-Mail-Service nicht konfiguriert' };
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: html || text
    });

    console.log('[EMAIL] E-Mail gesendet:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Fehler beim Senden:', error);
    return { success: false, error: error.message };
  }
}

// Template-Funktionen für verschiedene E-Mail-Typen

async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Willkommen bei BistroShifts',
    text: `Hallo ${user.display_name || user.email},\n\nWillkommen bei BistroShifts! Dein Account wurde erfolgreich erstellt.\n\nViel Erfolg!\nDein BistroShifts Team`,
    html: `
      <h2>Willkommen bei BistroShifts!</h2>
      <p>Hallo ${user.display_name || user.email},</p>
      <p>Dein Account wurde erfolgreich erstellt.</p>
      <p>Viel Erfolg!<br>Dein BistroShifts Team</p>
    `
  });
}

async function sendShiftSignupConfirmation(user, shift) {
  const startDate = new Date(shift.start_time).toLocaleString('de-DE');
  const endDate = new Date(shift.end_time).toLocaleString('de-DE');
  
  return sendEmail({
    to: user.email,
    subject: `Schicht-Anmeldung bestätigt: ${shift.title}`,
    text: `Hallo ${user.display_name || user.email},\n\nDeine Anmeldung für die Schicht wurde bestätigt:\n\nTitel: ${shift.title}\nStart: ${startDate}\nEnde: ${endDate}\nOrt: ${shift.location || 'Nicht angegeben'}\n\nVielen Dank!\nDein BistroShifts Team`,
    html: `
      <h2>Schicht-Anmeldung bestätigt</h2>
      <p>Hallo ${user.display_name || user.email},</p>
      <p>Deine Anmeldung für die Schicht wurde bestätigt:</p>
      <ul>
        <li><strong>Titel:</strong> ${shift.title}</li>
        <li><strong>Start:</strong> ${startDate}</li>
        <li><strong>Ende:</strong> ${endDate}</li>
        <li><strong>Ort:</strong> ${shift.location || 'Nicht angegeben'}</li>
      </ul>
      <p>Vielen Dank!<br>Dein BistroShifts Team</p>
    `
  });
}

async function sendEventStatusNotification(user, event, status, adminNotes) {
  const statusText = status === 'approved' ? 'genehmigt' : 'abgelehnt';
  const startDate = new Date(event.start_time).toLocaleString('de-DE');
  const endDate = new Date(event.end_time).toLocaleString('de-DE');
  
  return sendEmail({
    to: user.email,
    subject: `Event ${statusText}: ${event.title}`,
    text: `Hallo ${user.display_name || user.email},\n\nDein Event wurde ${statusText}:\n\nTitel: ${event.title}\nStart: ${startDate}\nEnde: ${endDate}${adminNotes ? `\n\nAdmin-Notiz: ${adminNotes}` : ''}\n\nDein BistroShifts Team`,
    html: `
      <h2>Event ${statusText}</h2>
      <p>Hallo ${user.display_name || user.email},</p>
      <p>Dein Event wurde <strong>${statusText}</strong>:</p>
      <ul>
        <li><strong>Titel:</strong> ${event.title}</li>
        <li><strong>Start:</strong> ${startDate}</li>
        <li><strong>Ende:</strong> ${endDate}</li>
      </ul>
      ${adminNotes ? `<p><strong>Admin-Notiz:</strong> ${adminNotes}</p>` : ''}
      <p>Dein BistroShifts Team</p>
    `
  });
}

async function sendNewEventNotificationToAdmins(adminEmails, event, creator) {
  const startDate = new Date(event.start_time).toLocaleString('de-DE');
  const endDate = new Date(event.end_time).toLocaleString('de-DE');
  
  return sendEmail({
    to: adminEmails.join(', '),
    subject: `Neuer Event-Antrag: ${event.title}`,
    text: `Ein neuer Event-Antrag wartet auf Genehmigung:\n\nTitel: ${event.title}\nBeschreibung: ${event.description || 'Keine'}\nStart: ${startDate}\nEnde: ${endDate}\nSichtbarkeit: ${event.members_only ? 'Nur Mitglieder' : 'Öffentlich'}\nErstellt von: ${creator.display_name || creator.email}\n\nBitte überprüfe den Antrag im Admin-Bereich.`,
    html: `
      <h2>Neuer Event-Antrag</h2>
      <p>Ein neuer Event-Antrag wartet auf Genehmigung:</p>
      <ul>
        <li><strong>Titel:</strong> ${event.title}</li>
        <li><strong>Beschreibung:</strong> ${event.description || 'Keine'}</li>
        <li><strong>Start:</strong> ${startDate}</li>
        <li><strong>Ende:</strong> ${endDate}</li>
        <li><strong>Sichtbarkeit:</strong> ${event.members_only ? 'Nur Mitglieder' : 'Öffentlich'}</li>
        <li><strong>Erstellt von:</strong> ${creator.display_name || creator.email}</li>
      </ul>
      <p>Bitte überprüfe den Antrag im Admin-Bereich.</p>
    `
  });
}

module.exports = {
  isEmailEnabled,
  sendEmail,
  sendWelcomeEmail,
  sendShiftSignupConfirmation,
  sendEventStatusNotification,
  sendNewEventNotificationToAdmins
};
