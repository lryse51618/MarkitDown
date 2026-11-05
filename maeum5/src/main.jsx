import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import Home from './Home.jsx';
import Pricing from './Pricing.jsx';
import Survey from './Survey.jsx';

// / = 홈(지금 체크·마음 정원·나와의 약속), /phq9 = 2주 마음 점검, /pricing = 요금 안내, /demo = 30일 리포트 미리보기(가상 인물)
const path = location.pathname;
const Page = path.startsWith('/demo') ? App : path.startsWith('/pricing') ? Pricing : path.startsWith('/phq9') ? Survey : Home;
createRoot(document.getElementById('root')).render(<Page />);
