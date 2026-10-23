import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers/AppProviders'
import { App } from './App'
import './portal.css'

const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('Không tìm thấy phần tử #root để khởi tạo Product Portal.')

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter basename="/portal">
        <App />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
