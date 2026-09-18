import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignupPage from "@/app/signup/page";

describe("signup form", () => {
  it("rejects mismatched passwords before calling Supabase", async () => {
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Jamie Rivera" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/repeat password/i), {
      target: { value: "password124" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});
