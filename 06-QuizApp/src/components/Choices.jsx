/* eslint-disable react/prop-types */
const Choices = ({ choice, index, handleSelected, selectedAnswerIndex }) => {
  return (
    <li
      onClick={() => handleSelected(choice, index)}
      className={`cursor-pointer bg-white p-3 rounded-lg shadow-lg ${
        selectedAnswerIndex === index
          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
          : ""
      }`}
    >
      {index + 1}. {choice}
    </li>
  );
};

export default Choices;
