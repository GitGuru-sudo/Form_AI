import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center gap-2 text-2xl font-bold text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 outline outline-2 outline-offset-2 outline-indigo-600/50">
            F
          </div>
          FormAI
        </div>
        <SignIn />
      </div>
    </div>
  );
}
