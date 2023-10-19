import "./App.css";
import EditDoc from "./components/EditDoc";

import Docs from "./components/docs";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from "react-router-dom";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Docs />} />
      <Route element={<EditDoc />} path="/editDoc/:id" />
    </>
  )
);

const App = () => {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
};

export default App;
