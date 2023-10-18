/* eslint-disable react/prop-types */

import { ACTIONS } from "./Calculator";

const DigitButton = ({ dispatch, digit }) => {
  return (
    <button onClick={() => dispatch({ type: ACTIONS.ADD, payload: { digit } })}>
      {digit}
    </button>
  );
};

export default DigitButton;
