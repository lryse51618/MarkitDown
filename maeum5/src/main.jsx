import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import Pricing from './Pricing.jsx';
import Survey from './Survey.jsx';

// / = 마음 체크(설문), /pricing = 요금 안내, /demo = 페르소나 시연 대시보드
const path = location.pathname;
const Page = path.startsWith('/demo') ? App : path.startsWith('/pricing') ? Pricing : Survey;
createRoot(document.getElementById('root')).render(<Page />);
