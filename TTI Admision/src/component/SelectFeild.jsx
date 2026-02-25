// function SelectField({ label, options, ...props }) {
//   return (
//     <>
//       <label>{label}</label>
//       <select {...props}>
//         <option value="" >--Select--</option>
//         {options.map(opt => (
//           <option key={opt} value={opt}className="select">{opt}</option>
//         ))}
//       </select>
//     </>
//   );
// }

// export default SelectField;




function SelectField({ label, id, options, placeholder = "--Select--", ...props }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        <option value="">{placeholder}</option>

        {options.map((opt, index) => {
          // If option is object (course case)
          if (typeof opt === "object") {
            return (
              <option key={opt.value} value={opt.value} className="select">
                {opt.label}
              </option>
            );
          }

          // If option is string (state/district case)
          return (
            <option key={opt} value={opt} className="select">
              {opt}
            </option>
          );
        })}
      </select>
    </>
  );
}

export default SelectField;
