
import Router from "../../../router/router";
import { useTokenExpiry } from "./useTokenExpiry";

export default function AppWrapper() {
  useTokenExpiry()
  return <Router />;
}