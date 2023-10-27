/* eslint-disable react/prop-types */
const Score = ({ addLeadingZero, activeQuestion, questions }) => {
  return (
    <div className="mb-3">
      <span className="text-2xl">
        {addLeadingZero(activeQuestion + 1)}/
        <span className="text-base">{addLeadingZero(questions.length)}</span>
      </span>
    </div>
  );
};

export default Score;
