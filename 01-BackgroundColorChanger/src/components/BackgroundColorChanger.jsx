import { useState } from "react";
import Button from "./Button";

const BackgroundColorChanger = () => {
  const [changeBgColor, setChangeBgColor] = useState("blue");

  const colors = ["red", "blue", "green", "purple"];

  function handleChange(color) {
    setChangeBgColor(color);
  }
  return (
    <div
      className={`bg-${changeBgColor}-900 w=[100%] h-[100vh] flex flex-col justify-center items-center`}
    >
      <h1 className="text-white text-6xl font-bold mb-8">
        Background Color Change
      </h1>
      <div className="flex pb-12 gap-4">
        {colors.map((color, index) => {
          return (
            <Button key={index} name={color} handleChange={handleChange} />
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundColorChanger;
