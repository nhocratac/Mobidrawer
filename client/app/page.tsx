import { redirect } from "next/navigation";

export default function Home() {
  
  redirect('/user/dashboard');
  return (
    <div className="mt-0 font-light">
    </div>
  );
}
