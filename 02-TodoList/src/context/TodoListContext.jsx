/* eslint-disable react/prop-types */
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

export const actions = {
  ADD: "add",
  DELETE: "delete",
  EDIT: "edit",
  DELETEALL: "deleteAll",
  GET_LOCAL_STORAGE_ITEMS: "getLocalStorageItems",
};

const context = createContext();

const reducer = (state, { type, payload }) => {
  switch (type) {
    case actions.ADD: {
      if (payload === "") {
        return state;
      }
      const newCounter = state.counter + 1;
      const newTask = {
        id: newCounter,
        task: payload,
      };
      return {
        counter: newCounter,
        Tasks: [...state.Tasks, newTask],
      };
    }

    case actions.DELETE: {
      return {
        counter: state.counter,
        Tasks: state.Tasks.filter((i) => i.id !== payload),
      };
    }

    case actions.EDIT: {
      const updatedTasks = state.Tasks.map((task) => {
        if (task.id === payload.id) {
          return { ...task, task: payload.updatedText };
        }
        return task;
      });
      return {
        ...state,
        Tasks: updatedTasks,
      };
    }

    case actions.DELETEALL: {
      return initialState;
    }

    case actions.GET_LOCAL_STORAGE_ITEMS: {
      return payload;
    }
  }
};

const initialState = {
  counter: 0,
  Tasks: [],
};

export const useTodoListContext = () => {
  return useContext(context);
};

const TodoListContext = ({ children }) => {
  const [text, setText] = useState("");
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("Todo-List"));
    if (items) {
      dispatch({
        type: actions.GET_LOCAL_STORAGE_ITEMS,
        payload: items,
      });
    }
  }, []);

  useEffect(() => {
    if (state !== initialState) {
      localStorage.setItem("Todo-List", JSON.stringify(state));
    }
  }, [state]);

  return (
    <context.Provider value={{ state, dispatch, text, setText }}>
      {children}
    </context.Provider>
  );
};

export default TodoListContext;
