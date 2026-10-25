import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers/AppProviders'
import { PodApp } from './routes'
import './pod.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Không tìm thấy #root để khởi tạo POD.')

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter basename="/pod">
        <PodApp />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
