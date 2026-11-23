import { Stack, useLocalSearchParams } from 'expo-router';
import { JobFormView } from '../../../components/JobFormView';

export default function EditJob() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  return (
    <>
      <Stack.Screen options={{ title: 'Edit job' }} />
      <JobFormView id={id} />
    </>
  );
}
