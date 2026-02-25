

function InputField({ label, id, required = false, ...props }) {
  return (
    <div className="input-field-wrapper">
      <label className="input-label" htmlFor={id}>
        {label}
        {required && <span className="visually-hidden"> required</span>}
      </label>
      <input
        id={id}
        className="input-field"
        aria-required={required}
        {...props}
      />
      <span className="input-underline" aria-hidden="true"></span>
    </div>
  );
}

export default InputField;

