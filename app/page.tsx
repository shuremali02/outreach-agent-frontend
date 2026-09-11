import { redirect } from "next/navigation";

/** Streamlit's default tab was "Today". */
export default function Home() {
  redirect("/today");
}
