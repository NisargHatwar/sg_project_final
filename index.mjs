import express from "express";
import { getRandStr, readData, writeData } from "./udf.mjs";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/templates"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Home page
app.get("/login", (req, res) => {
  return res.render("login.ejs");
});

// Route to handle the login form submission
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const data = await readData("users.json");
  const user = data.find(
    (user) => user.username === username && user.password === password
  );
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid username or password",
    });
  }
  // If user exists, create cookie and redirect
  const sessionId = getRandStr(16);
  const obj = {
    cookienum: sessionId,
    username: username,
    isAdmin: user.isAdmin,
  };
  // Add cookie to cookies.json
  const cookieData = await readData("cookies.json");
  cookieData.push(obj);
  await writeData("cookies.json", cookieData);
  if (user.isAdmin) {
    return res.redirect(`/admin/${sessionId}/faults`);
  }
  return res.redirect(`/user/${sessionId}`);
});

// Route for user after login (not admin)
app.get("/user/:sessionId", async (req, res) => {
  // check if cookie exists
  const { sessionId } = req.params;
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionId);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // check if user is admin
  if (user.isAdmin) {
    return res.redirect(`/admin/${sessionId}`);
  }
  // read switch data from switches.json
  const switchData = await readData("switches.json");
  const sw = switchData.find((sw) => sw.username == user.username);
  res.render("user.ejs", {
    username: user.username,
    s0: sw.states[0],
    s1: sw.states[1],
    s2: sw.states[2],
    s3: sw.states[3],
    s4: sw.states[4],
    s5: sw.states[5],
    s6: sw.states[6],
    unnum: sessionId,
  });
});

app.post("/user/:sessionId/:btnnum", async (req, res) => {
  const { sessionId, btnnum } = req.params;
  // check if sessionId exists
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionId);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // get switch data for this user from switches.json
  const switchData = await readData("switches.json");
  const sw = switchData.find((sw) => sw.username == user.username);
  // toggle the state of the switch
  sw.states[btnnum] = sw.states[btnnum] == 0 ? 1 : 0;
  // write the updated switch data to switches.json
  await writeData("switches.json", switchData);
  // Send 200 OK response
  res.status(200).json({ message: "State updated successfully" });
});

app.post("/recloser/api", async (req, res) => {
  console.log(req.body);
  const { voltage, reclose_attempts, permanent_fault, Temp_fault } = req.body;
  if (permanent_fault || Temp_fault) {
    const faults = await readData("faults.json");
    const fault_type = permanent_fault ? "Permenant" : "Temporary";
    const time = new Date();
    time.setHours(time.getHours() + 5);
    time.setMinutes(time.getMinutes() + 30);
    const data = { fault_type, reclose_attempts, time, voltage };
    faults.push(data);
    await writeData("faults.json", faults);
  }
  return res.status(200).json({ message: "Data saved successfully" });
});

// api route to get switch data
app.get("/api/user/:user", async (req, res) => {
  const { user } = req.params;
  // check if user exists
  const switchData = await readData("switches.json");
  const sw = switchData.find((sw) => sw.username == user);
  if (!sw) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // send the switch data as json response
  res
    .status(200)
    .json([
      sw.states[0] + 1,
      sw.states[1] + 1,
      sw.states[2] + 1,
      sw.states[3] + 1,
      sw.states[4] + 1,
      sw.states[5] + 1,
    ]);
});

app.get("/admin/:sessionID/faults", async (req, res) => {
  const { sessionID } = req.params;
  // check if cookie exists
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionID);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // check if user is admin
  if (!user.isAdmin) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "You are not an admin",
    });
  }
  const faults = await readData("faults.json");
  res.render("faults.ejs", { faults });
});

// page to switch on and off all switches for admin
app.get("/admin/:sessionID/switches", async (req, res) => {
  const { sessionID } = req.params;
  // check if cookie exists
  const cookieData = await readData("cookies.json");
  const user = cookieData.find((cookie) => cookie.cookienum == sessionID);
  if (!user) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "Invalid session",
    });
  }
  // check if user is admin
  if (!user.isAdmin) {
    return res.status(401).render("error.ejs", {
      status: 401,
      message: "You are not an admin",
    });
  }
  const switchData = await readData("switches.json");
  res.render("admin_switches.ejs", {
    u0s0: switchData[0].states[0],
    u0s1: switchData[0].states[1],
    u0s2: switchData[0].states[2],
    u0s3: switchData[0].states[3],
    u0s4: switchData[0].states[4],
    u0s5: switchData[0].states[5],
    u0s6: switchData[0].states[6],
    u1s0: switchData[1].states[0],
    u1s1: switchData[1].states[1],
    u1s2: switchData[1].states[2],
    u1s3: switchData[1].states[3],
    u1s4: switchData[1].states[4],
    u1s5: switchData[1].states[5],
    u1s6: switchData[1].states[6],
    u2s0: switchData[2].states[0],
    u2s1: switchData[2].states[1],
    u2s2: switchData[2].states[2],
    u2s3: switchData[2].states[3],
    u2s4: switchData[2].states[4],
    u2s5: switchData[2].states[5],
    u2s6: switchData[2].states[6],
    u3s0: switchData[3].states[0],
    u3s1: switchData[3].states[1],
    u3s2: switchData[3].states[2],
    u3s3: switchData[3].states[3],
    u3s4: switchData[3].states[4],
    u3s5: switchData[3].states[5],
    u3s6: switchData[3].states[6],
    u4s0: switchData[4].states[0],
    u4s1: switchData[4].states[1],
    u4s2: switchData[4].states[2],
    u4s3: switchData[4].states[3],
    u4s4: switchData[4].states[4],
    u4s5: switchData[4].states[5],
    u4s6: switchData[4].states[6],
    u5s0: switchData[5].states[0],
    u5s1: switchData[5].states[1],
    u5s2: switchData[5].states[2],
    u5s3: switchData[5].states[3],
    u5s4: switchData[5].states[4],
    u5s5: switchData[5].states[5],
    u5s6: switchData[5].states[6],
  });
});

// Post route to change switch states for admin
app.post("/admin/switches/:username/:switch_no", async (req, res) => {
  const { username, switch_no } = req.params;
  console.log(req.body);

  // // Get switch data for this user from switches.json
  // const switchData = await readData("switches.json");
  // const sw = switchData.find((sw) => sw.username === username);

  // // Check if the user exists in switchData
  // if (!sw) {
  //   return res.status(404).render("error.ejs", {
  //     status: 404,
  //     message: `User ${username} not found in switch data`,
  //   });
  // }

  // // Check if the switch number is valid
  // if (!sw.states || !sw.states[switch_no]) {
  //   return res.status(400).render("error.ejs", {
  //     status: 400,
  //     message: `Invalid switch number ${switch_no} for user ${username}`,
  //   });
  // }

  // // Toggle the state of the switch
  // sw.states[switch_no] = sw.states[switch_no] === 0 ? 1 : 0;

  // // Write the updated switch data to switches.json
  // await writeData("switches.json", switchData);

  // Send 200 OK response
  res.status(200).json({ message: "State updated successfully" });
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.listen(port, () => {
  console.log("Listening on port 3000");
});
