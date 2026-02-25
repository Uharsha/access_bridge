import React from "react";

function RatioBasic({ value, onChange }) {
  const options = ["Fair","Good","Excellent","Outstanding","None"]; 

  return (
    <fieldset className="radio-fieldset" aria-label="Screen reader knowledge">
      <legend className="radio-legend">The knowledge of screen reader (NVDA or Jaws)?</legend>

      <div className="radio-inputs">
        {options.map((option, index) => (
          <label className="labeel" key={option} htmlFor={`ScreenReader-${index}`}>
            <input
              type="radio"
              name="ScreenReader"
              id={`ScreenReader-${index}`}
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

export default RatioBasic;