import { ThemeProvider } from "@emotion/react";
import { theme } from "./styles/Theme";
import AppRouter from "./routes";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;