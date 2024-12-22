import { SnackbarProvider } from "notistack";
import AuthContextProvider from "./state/AuthContextProvider.tsx";
import Routing from "./Routing.tsx";
import { BrowserRouter } from "react-router-dom";

const App = () => {
  return (
    <BrowserRouter>
      <SnackbarProvider>
        <AuthContextProvider>
          <Routing />
        </AuthContextProvider>
      </SnackbarProvider>
    </BrowserRouter>
  );
};

export default App;
