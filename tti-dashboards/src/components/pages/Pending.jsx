


import StudentList from "./StudentList";
import { getPendingStudents } from "../../server/Api";

export default function HeadAccepted() {
  return (
    <StudentList
      title="Pending Admissions"
      fetchFn={getPendingStudents}
    />
  );
}
