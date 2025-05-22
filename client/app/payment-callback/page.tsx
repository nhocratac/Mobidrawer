import { Suspense } from 'react';
import PaymentCallbackClient from './PaymentCallbackClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <PaymentCallbackClient />
    </Suspense>
  );
}
