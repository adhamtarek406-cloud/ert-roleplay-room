import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './ds/tokens.css';
import './app.css';
import CreateRoom from './views/CreateRoom.jsx';
import HostConsole from './views/HostConsole.jsx';
import TraineeRoom from './views/TraineeRoom.jsx';

// Routes: /  → create a room (trainer)
//         /room/:code/host → trainer console   /room/:code → trainee view (the shared link)
function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);
  const navigate = to => { history.pushState(null, '', to); setPath(to); scrollTo(0, 0); };

  const m = path.match(/^\/room\/([A-Za-z0-9-]+)(\/host)?\/?$/);
  if (!m) return <CreateRoom navigate={navigate} />;
  const code = m[1].toUpperCase();
  return m[2] ? <HostConsole key={code} code={code} navigate={navigate} /> : <TraineeRoom key={code} code={code} />;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
