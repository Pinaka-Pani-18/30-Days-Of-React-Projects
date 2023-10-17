import TodoList from "./components/TodoList";
import TodoListContext from "./context/TodoListContext";

const App = () => {
  return (
    <TodoListContext>
      <div className="h-screen bg-gradient-to-r from-emerald-500 to-purple-500  flex items-center flex-col">
        <TodoList />
      </div>
    </TodoListContext>
  );
};

export default App;
