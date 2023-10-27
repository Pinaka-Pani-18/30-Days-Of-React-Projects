import "./App.css";

import QuizApp from "./components/QuizApp";

const App = () => {
  return (
    <div className="flex justify-center items-center h-[100vh] flex-col bg-gradient-to-r from-cyan-500 to-blue-500">
      <div className="bg-white px-10 py-4 mb-5 rounded-full">
        <h1 className="text-3xl bg-gradient-to-r from-primary to-danger bg-clip-text text-transparent font-bold ">
          Quiz App
        </h1>
      </div>

      <QuizApp />
    </div>
  );
};

export default App;
