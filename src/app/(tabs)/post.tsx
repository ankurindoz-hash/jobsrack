import { EmployerGate } from '../../components/EmployerGate';
import { JobFormView } from '../../components/JobFormView';

export default function Post() {
  return (
    <EmployerGate what="post a job">
      <JobFormView />
    </EmployerGate>
  );
}
