import MafiaIdleGame from "./MafiaIdleGame";
import { ToastProvider } from "./components/Toast";

function App() {
  return (
    <ToastProvider>
      <MafiaIdleGame />
    </ToastProvider>
  );
}

export default App;
