import { validateProfile } from "./form.mjs";
const form = document.querySelector("form");
const output = document.querySelector("output");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await validateProfile({ profile: { name: new FormData(form).get("name") } });
  const message = result.errors.profile?.name?.message;
  output.textContent = message ?? `Accepted: ${result.values.profile.name}`;
  output.dataset.state = message ? "invalid" : "valid";
});
