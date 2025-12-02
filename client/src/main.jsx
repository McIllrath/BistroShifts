import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// Import Bootstrap and Bootstrap Icons from node_modules for offline usage
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<App />)
