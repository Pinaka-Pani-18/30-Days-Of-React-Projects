import { useState } from "react";
import { actions, useTodoListContext } from "../context/TodoListContext";

const TodoList = () => {
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskText, setEditTaskText] = useState("null");
  const { state, dispatch, text, setText } = useTodoListContext();

  function handleAdd() {
    dispatch({
      type: actions.ADD,
      payload: text,
    });
    setText("");
  }

  function handleEdit(item) {
    setEditTaskText(item.task);
    setEditTaskId(item.id);
  }

  function handleSave() {
    dispatch({
      type: actions.EDIT,
      payload: {
        id: editTaskId,
        updatedText: editTaskText,
      },
    });
    setEditTaskId(null);
    setEditTaskText("");
  }

  function handleEnterKey(e) {
    if (e.key == "Enter") {
      dispatch({
        type: actions.ADD,
        payload: text,
      });
      setText("");
    }
  }

  return (
    <>
      <h1 className="mt-28 tracking-[.2rem] mb-8 font-bold rounded-full text-red-500 bg-white py-3 px-10">
        TODO LIST
      </h1>
      <div className="w-[40rem] flex bg-white  p-3 rounded-full ">
        <input
          type="text"
          className=" flex-grow px-5 text-3xl outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => handleEnterKey(e)}
        />
        <button
          className="bg-red-500 hover:bg-red-400 text-white p-3 rounded-full"
          onClick={handleAdd}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      </div>
      {state.Tasks.length > 0 ? (
        <div className="flex w-[40rem] justify-between gap-7 mt-7 mb-2">
          <h3 className=" font-bold rounded-full text-black bg-white py-3 px-7">
            TASKS :
          </h3>
          {state.Tasks.length > 1 && (
            <button
              className=" rounded-full text-black bg-white px-4 hover:text-red-500"
              onClick={() => dispatch({ type: actions.DELETEALL })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <h3 className="mt-5 ">No Tasks has been added</h3>
      )}
      <ul className="w-[40rem] h-auto overflow-y-auto flex flex-col overflow-hidden bg-black rounded-2xl shadow-xl">
        {state.Tasks.map((item, index) => {
          return (
            <li
              key={index}
              className="bg-white flex w-full justify-between border-b-blue-600 border-b p-4 h-auto"
            >
              {editTaskId === item.id ? (
                <input
                  type="text"
                  value={editTaskText}
                  className=" flex-grow outline-none text-red-500"
                  onChange={(e) => setEditTaskText(e.target.value)}
                />
              ) : (
                <span>
                  {index + 1}. {item.task}
                </span>
              )}

              <div className="flex gap-4">
                {editTaskId === item.id ? (
                  <button onClick={handleSave} className="text-red-500">
                    SAVE
                  </button>
                ) : (
                  <button
                    className="text-green-500"
                    onClick={() => handleEdit(item)}
                  >
                    EDIT
                  </button>
                )}

                <button
                  className="text-red-500"
                  onClick={() =>
                    dispatch({
                      type: actions.DELETE,
                      payload: item.id,
                    })
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default TodoList;
