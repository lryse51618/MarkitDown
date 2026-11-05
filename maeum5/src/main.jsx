import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import Survey from './Survey.jsx';

// / = 마음 체크(설문), /demo = 페르소나 시연 대시보드
const Page = location.pathname.startsWith('/demo') ? App : Survey;
createRoot(document.getElementById('root')).render(<Page />);
