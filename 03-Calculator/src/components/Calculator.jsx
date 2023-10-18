/* eslint-disable no-undef */
import { useReducer } from "react";
import DigitButton from "./DigitButton";
import OperatorButton from "./OperatorButton";

export const ACTIONS = {
  ADD: "add-digit",
  OPERATOR: "operator",
  ClEAR: "clear",
  DELETE: "delete",
  EVALUATE: "evaluate",
};

const reducer = (state, { type, payload }) => {
  switch (type) {
    case ACTIONS.ADD:
      if (state.overwrite) {
        return {
          ...state,
          currentValue: payload.digit,
          overwrite: false,
        };
      }

      if (payload.digit === "0" && state.currentValue === "0") {
        return state;
      }

      if (
        (payload.digit === "." && state.currentValue == null) ||
        (payload.digit === "." && state.currentValue.includes("."))
      ) {
        return state;
      }

      return {
        ...state,
        currentValue: `${state.currentValue || ""}${payload.digit}`,
      };

    case ACTIONS.OPERATOR:
      if (state.currentValue == null && state.previousValue == null) {
        return state;
      }
      if (state.previousValue == null) {
        return {
          operation: payload.operation,
          previousValue: state.currentValue,
          currentValue: null,
        };
      }
      if (state.currentValue == null) {
        return {
          ...state,
          operation: payload.operation,
        };
      }
      return {
        previousValue: evaluate(state),
        operation: payload.operation,
        currentValue: null,
      };

    case ACTIONS.ClEAR:
      return {};

    case ACTIONS.DELETE:
      if (state.overwrite) {
        return {
          ...state,
          currentValue: null,
          overwrite: false,
        };
      }

      if (state.currentValue == null && state.previousValue == null) {
        return state;
      }

      if (state.currentValue === null) {
        return state;
      }
      return {
        ...state,
        currentValue: state.currentValue.slice(0, -1),
      };

    case ACTIONS.EVALUATE:
      if (
        state.operation == null ||
        state.currentValue == null ||
        state.currentValue == null
      ) {
        return state;
      }
      return {
        ...state,
        overwrite: true,
        operation: null,
        previousValue: null,
        currentValue: evaluate(state),
      };
  }
};

function evaluate(state) {
  const prev = parseFloat(state.previousValue);
  const curr = parseFloat(state.currentValue);

  if (isNaN(prev) || isNaN(curr)) {
    return "";
  }

  let finalResult = "";

  switch (state.operation) {
    case "+":
      finalResult = prev + curr;
      break;
    case "-":
      finalResult = prev - curr;
      break;
    case "/":
      finalResult = prev / curr;
      break;

    case "*":
      finalResult = prev * curr;
      break;
  }

  return finalResult;
}

const INTEGER_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatNumber(value) {
  if (value == null) {
    return;
  }

  const [integer, decimal] = value.toString().split(".");

  if (decimal == null) {
    return INTEGER_FORMATTER.format(integer);
  }

  return `${INTEGER_FORMATTER.format(integer)}.${decimal}`;
}

const Calculator = () => {
  const [{ currentValue, previousValue, operation }, dispatch] = useReducer(
    reducer,
    {}
  );

  return (
    <div className="calculator">
      <div className="output">
        <div className="prev-output">
          {formatNumber(previousValue)} {operation}
        </div>
        <div className="curr-output">{formatNumber(currentValue)}</div>
      </div>
      <button
        className="span-two"
        onClick={() => {
          dispatch({ type: ACTIONS.ClEAR });
        }}
      >
        AC
      </button>
      <button
        onClick={() => {
          dispatch({ type: ACTIONS.DELETE });
        }}
      >
        DEL
      </button>
      <OperatorButton operation={"/"} dispatch={dispatch} />
      <DigitButton digit="7" dispatch={dispatch} />
      <DigitButton digit="8" dispatch={dispatch} />
      <DigitButton digit="9" dispatch={dispatch} />
      <OperatorButton operation={"*"} dispatch={dispatch} />

      <DigitButton digit="4" dispatch={dispatch} />
      <DigitButton digit="5" dispatch={dispatch} />
      <DigitButton digit="6" dispatch={dispatch} />
      <OperatorButton operation={"+"} dispatch={dispatch} />

      <DigitButton digit="1" dispatch={dispatch} />
      <DigitButton digit="2" dispatch={dispatch} />
      <DigitButton digit="3" dispatch={dispatch} />
      <OperatorButton operation={"-"} dispatch={dispatch} />

      <DigitButton digit="0" dispatch={dispatch} />
      <DigitButton digit="." dispatch={dispatch} />

      <button
        className="span-two"
        onClick={() => {
          dispatch({
            type: ACTIONS.EVALUATE,
          });
        }}
      >
        =
      </button>
    </div>
  );
};

export default Calculator;
