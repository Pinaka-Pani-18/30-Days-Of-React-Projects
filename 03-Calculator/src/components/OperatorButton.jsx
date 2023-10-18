/* eslint-disable react/prop-types */

import { ACTIONS } from "./Calculator";

const OperatorButton = ({ dispatch, operation }) => {
  return (
    <button
      onClick={() =>
        dispatch({ type: ACTIONS.OPERATOR, payload: { operation } })
      }
    >
      {operation}
    </button>
  );
};

export default OperatorButton;
