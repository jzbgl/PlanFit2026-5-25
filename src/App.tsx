import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TodayPlan from './pages/TodayPlan';
import PlanOverview from './pages/PlanOverview';
import TrainingRecords from './pages/TrainingRecords';
import MyProfile from './pages/MyProfile';
import Community from './pages/Community';
import Sidebar from './components/Sidebar';
import { useApp } from './context/AppContext';

function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/today" element={<TodayPlan />} />
          <Route path="/overview" element={<PlanOverview />} />
          <Route path="/records" element={<TrainingRecords />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { state } = useApp();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={state.currentUser ? <AppLayout /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
