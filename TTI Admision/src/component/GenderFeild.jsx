
import React from "react";


function GenderRadio({ value, onChange }) {
  const options = ["Male", "Female", "Other"]; 

  return (
    <fieldset className="radio-fieldset" aria-label="Gender">
      <legend className="radio-legend">Gender</legend>
      <div className="radio-inputs">
        {options.map((option, index) => (
          <label className="labeel" key={option} htmlFor={`gender-${index}`}>
            <input
              type="radio"
              name="gender"
              id={`gender-${index}`}
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
