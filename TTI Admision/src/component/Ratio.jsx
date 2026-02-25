
import React from "react";


function GenderRadio({ value, onChange }) {
  const options = ["Fair", "Good", "Excellent", "Outstanding", "None"]; 

  return (
    <fieldset className="radio-fieldset" aria-label="Basic computer knowledge">
      <legend className="radio-legend">Rate yourself about the knowledge of Basic Computer?</legend>
      <div className="radio-inputs">
        {options.map((option, index) => (
          <label className="labeel" key={option} htmlFor={`basicComputerKnowledge-${index}`}>
            <input
              type="radio"
              name="basicComputerKnowledge"
              id={`basicComputerKnowledge-${index}`}
              value={option}
              checked={value === option}
              onChange={onChange}
            />
            <span className="texts">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default GenderRadio;
