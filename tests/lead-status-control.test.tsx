import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { LeadStatusControl } from "@/components/LeadStatusControl";
import { updateLeadStatus } from "@/app/actions/leads";

vi.mock("@/app/actions/leads", () => ({
  updateLeadStatus: vi.fn(),
}));

describe("LeadStatusControl", () => {
  it("only offers statuses that are valid next steps from the current one", () => {
    render(<LeadStatusControl leadId="lead-1" status="contacted" />);

    const select = screen.getByRole("combobox");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);

    // From "contacted": engaged, lost, do_not_contact are valid; qualified/won are not.
    expect(options.some((o) => o?.includes("Engaged"))).toBe(true);
    expect(options.some((o) => o?.includes("Lost"))).toBe(true);
    expect(options.some((o) => o?.includes("Do not contact"))).toBe(true);
    expect(options.some((o) => o?.includes("Qualified"))).toBe(false);
    expect(options.some((o) => o?.includes("Won"))).toBe(false);
  });

  it("calls updateLeadStatus with the selected status", async () => {
    render(<LeadStatusControl leadId="lead-1" status="contacted" />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "engaged" } });

    await waitFor(() => {
      expect(updateLeadStatus).toHaveBeenCalledWith("lead-1", "engaged");
    });
  });

  it("shows no dropdown for a terminal status", () => {
    render(<LeadStatusControl leadId="lead-1" status="won" />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText(/no further status changes/i)).toBeInTheDocument();
  });
});
