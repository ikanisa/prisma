import { AdaptiveLayout } from './components/layout/AdaptiveLayout';
import { DashboardPage } from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <AdaptiveLayout>
      <DashboardPage />
    </AdaptiveLayout>
  );
}

export default App;
