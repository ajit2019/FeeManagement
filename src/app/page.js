import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        
        <h1 className="text-4xl font-bold">Fee Management</h1>
        <nav className="space-y-2 mt-6">
          <a href="/admission" className="block text-blue-600 hover:text-blue-800 font-semibold">Student Admission Form</a>
          <a href="/studentdetails" className="block text-blue-600 hover:text-blue-800 font-semibold">Student Admission Registry</a>
          <a href="/fee" className="block text-blue-600 hover:text-blue-800 font-semibold">Fee Submission Form</a>
          <a href="/balance" className="block text-blue-600 hover:text-blue-800 font-semibold">Class Balance Summary</a>
          <a href="/about" className="block text-blue-600 hover:text-blue-800 font-semibold">About</a>
        </nav>
      </main>
    </div>
  );
}
