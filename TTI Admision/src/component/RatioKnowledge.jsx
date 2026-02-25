
import React from "react";


function RatioKnowledge({ value, onChange }) {
  const options = ["Fair", "Good", "Excellent", "Outstanding", "None"]; 

  return (
    <fieldset className="radio-fieldset" aria-label="Basic English skills">
      <legend className="radio-legend">How will you rate yourself in Basic English Skills?</legend>
      <div className="radio-inputs">
        {options.map((option, index) => (
          <label className="labeel" key={option} htmlFor={`basicEnglishSkills-${index}`}>
            <input
              type="radio"
              name="basicEnglishSkills"
              id={`basicEnglishSkills-${index}`}
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

export default RatioKnowledge;
