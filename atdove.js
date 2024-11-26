export const handleDomainLogic = async (page, domain, urlPath, users) => {
  // Check if we're already on the login page
  if (urlPath === "/user/login") return;

  // Default to the first user in the config
  const { username, password } = users[0];

  // Navigate to /user to log in
  await page.goto(`${domain}/user`);

  // Fill out login form
  await page.fill('input[name="name"]', username);
  await page.fill('input[name="pass"]', password);
  await page.click('input[type="submit"]');

  // Navigate to the requested path
  await page.goto(`${domain}${urlPath}`);
};
