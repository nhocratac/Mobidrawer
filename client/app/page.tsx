import { redirect } from "next/navigation";



export default function Home() {
  redirect("/dashboard");
  return (
    <div className="mt-0 font-light">
    </div>
  );
}
