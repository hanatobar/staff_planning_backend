const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();
const authService = require("./services/authService");
const path = require('path');




const staffController = require('./controllers/staffController');
const authController = require('./controllers/authController');
const courseController = require('./controllers/courseController');
const preferenceController = require("./controllers/preferenceController");
const courseRequirementController = require("./controllers/courseRequirementController");
const assignmentController = require("./controllers/assignmentController");
const preferenceRoundController = require("./controllers/preferenceRoundController");
const notificationController = require("./controllers/notificationController");
const notificationService = require("./services/notificationService");
const { getNotificationsByUser } = require('./repositories/notificationRepository');
const messageController = require("./controllers/messageController");

const staffPackageDefinition =protoLoader.loadSync(
  path.join(__dirname, 'proto', 'staff.proto')
);
const coursePackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'course.proto')
);
const preferencePackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'preference.proto')
);
const courseRequirementPackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'course_requirement.proto')
);
const assignmentPackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'assignment.proto')
);
const preferenceRoundPackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'preference_round.proto')
);
const notificationPackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'notification.proto')
);
const messagePackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'message.proto')
);
const authPackageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'auth.proto')
);



const staffProto = grpc.loadPackageDefinition(staffPackageDefinition);
const courseProto = grpc.loadPackageDefinition(coursePackageDefinition).course;
const preferenceProto = grpc.loadPackageDefinition(preferencePackageDefinition).preference;
const courseRequirementProto = grpc.loadPackageDefinition(courseRequirementPackageDefinition).course_requirement;
const preferenceRoundProto = grpc.loadPackageDefinition(preferenceRoundPackageDefinition).preference_round;
const assignmentProto = grpc.loadPackageDefinition(assignmentPackageDefinition).assignment;
const notificationProto = grpc.loadPackageDefinition(notificationPackageDefinition).notification;
const messageProto = grpc.loadPackageDefinition(messagePackageDefinition).message;
const authProto = grpc.loadPackageDefinition(authPackageDefinition).auth;

function main(){

  const server = new grpc.Server();

  server.addService(staffProto.StaffService.service,{

    AddStaff: staffController.addStaff,
    GetAllStaff: staffController.getAllStaff,
    DeleteStaff: staffController.deleteStaff,
    UpdateStaff: staffController.updateStaff,
    UpdateTaPriorityOrder: staffController.updateTaPriorityOrder

  });
  server.addService(courseProto.CourseService.service,{

    AddCourse: courseController.addCourse,
    GetAllCourses: courseController.getAllCourses,
    DeleteCourse: courseController.deleteCourse,
    UpdateCourse: courseController.updateCourse
  });
server.addService(preferenceProto.PreferenceService.service, {

  AddPreference: preferenceController.addPreference,

  GetPreferencesByStaff: preferenceController.getPreferencesByStaff,

  UpdatePreference: preferenceController.updatePreference,

  GetAllPreferences: preferenceController.getAllPreferences,
  ResetPreferences: preferenceController.resetPreferences

});
  server.addService(authProto.AuthService.service,{
  Signup:authController.signup,
  Login:authController.login,
  SetInitialPassword: authController.setInitialPassword,
  GetCoordinatorUser: authController.getCoordinatorUser,
  CheckInitialPasswordStatus: authController.checkInitialPasswordStatus,
  CreateCoordinator: authController.createCoordinator,
  DeleteCoordinator: authController.deleteCoordinator
});

server.addService(courseRequirementProto.CourseRequirementService.service, {

  AddRequirement: courseRequirementController.addRequirement,
  GetAllRequirements: courseRequirementController.getAllRequirements,
  UpdateRequirement: courseRequirementController.updateRequirement

});

  server.addService(preferenceRoundProto.PreferenceRoundService.service, {

    OpenRound: preferenceRoundController.openRound,
    GetCurrentRound: preferenceRoundController.getCurrentRound,
    LockRound: preferenceRoundController.lockRound,
    GetSubmissionStatus: preferenceRoundController.getSubmissionStatus 
  });

server.addService(
  assignmentProto.AssignmentService.service,
  {
    GeneratePlan: assignmentController.generatePlan,
    GetAssignments: assignmentController.getAssignments,
    GetAnalytics: assignmentController.getAnalytics,

ApprovePlan: assignmentController.approvePlan,
GetAssignmentsByStaff: assignmentController.getAssignmentsByStaff,
GetConflicts: assignmentController.getConflicts,
GetNonSubmitters: assignmentController.getNonSubmitters,
GetUncoveredHours: assignmentController.getUncoveredHours,
AssignUncoveredHours: assignmentController.assignUncoveredHours,
TransferAssignmentHours: assignmentController.transferAssignmentHours,
SubmitAppeal: assignmentController.submitAppeal,
GetAppealsByStaff: assignmentController.getAppealsByStaff,
GetAllAppeals: assignmentController.getAllAppeals,
ReviewAppeal: assignmentController.reviewAppeal,
ResolveAppeal: assignmentController.resolveAppeal,
GetAppealDetails: assignmentController.getAppealDetails

  }
);

server.addService(notificationProto.NotificationService.service, {
  GetNotificationsByUser: notificationController.getNotificationsByUser,
  GetUnreadCount: notificationController.getUnreadCount,
  MarkNotificationAsRead: notificationController.markNotificationAsRead,
  MarkAllNotificationsAsRead: notificationController.markAllNotificationsAsRead,
  SendNotificationToAllTAs: notificationController.sendNotificationToAllTAs,
  SendNotificationToOneUser: notificationController.sendNotificationToOneUser,
  SendNotificationToSelectedUsers: notificationController.sendNotificationToSelectedUsers
});

server.addService(messageProto.MessageService.service, {
  SendMessage: messageController.sendMessage,
GetConversation: messageController.getConversation,
GetInbox: messageController.getInbox,
MarkConversationAsRead: messageController.markConversationAsRead,
GetUnreadMessageCount: messageController.getUnreadMessageCount,
});



const PORT = 50051;
const HOST = "0.0.0.0";
const ADDRESS = `${HOST}:${PORT}`;

server.bindAsync(
  ADDRESS,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("gRPC bind error:", err);
      return;
    }

    console.log(`gRPC server running on ${ADDRESS}`);
    server.start();
  }
);



}
const express = require("express");

const app = express();

app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: err.message });
  }
});

app.post("/auth/set-initial-password", async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.setInitialPassword(email, password);

  res.json(result);
});



process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

const assignmentHttpController = require("./controllers/assignmentHttpController");

app.post("/assignments/generate", (req, res) =>
  assignmentHttpController.generatePlan(req, res)
);
app.get("/assignments", (req, res) =>
  assignmentHttpController.getAssignments(req, res)
);
app.get("/assignments/staff/:id", (req, res) => assignmentHttpController.getAssignmentsByStaff(req, res));
app.post("/assignments/approve", (req, res) => assignmentHttpController.approvePlan(req, res));

app.get("/assignments/analytics", (req, res) => assignmentHttpController.getAnalytics(req, res));
app.get("/assignments/conflicts", (req, res) => assignmentHttpController.getConflicts(req, res));
app.get("/assignments/non-submitters", (req, res) => assignmentHttpController.getNonSubmitters(req, res));
app.get("/assignments/uncovered-hours", (req, res) => assignmentHttpController.getUncoveredHours(req, res));

app.post("/assignments/uncovered-hours/assign", (req, res) => assignmentHttpController.assignUncoveredHours(req, res));
app.post("/assignments/transfer", (req, res) => assignmentHttpController.transferAssignmentHours(req, res));

app.post("/assignments/appeals", (req, res) => assignmentHttpController.submitAppeal(req, res));
app.get("/assignments/appeals/staff/:id", (req, res) => assignmentHttpController.getAppealsByStaff(req, res));
app.get("/assignments/appeals", (req, res) => assignmentHttpController.getAllAppeals(req, res));
app.post("/assignments/appeals", (req, res) => 
  assignmentHttpController.submitAppeal(req, res)
);

app.get("/assignments/appeals/:id", (req, res) => assignmentHttpController.getAppealDetails(req, res));
app.post("/assignments/appeals/review", (req, res) => assignmentHttpController.reviewAppeal(req, res));
app.post("/assignments/appeals/resolve", (req, res) => assignmentHttpController.resolveAppeal(req, res));

const courseRequirementHttpController = require("./controllers/courseRequirementHttpController");

app.post("/course-requirements", (req, res) =>
  courseRequirementHttpController.addRequirement(req, res)
);
app.put("/course-requirements/:id", (req, res) =>
  courseRequirementHttpController.updateRequirement(req, res)
);
app.get("/course-requirements", (req, res) =>
  courseRequirementHttpController.getAllRequirements(req, res)
);

const courseHttpController = require("./controllers/courseHttpController");

app.post("/courses", (req, res) => courseHttpController.addCourse(req, res));
app.get("/courses", (req, res) => courseHttpController.getAllCourses(req, res));
app.delete("/courses/:id", (req, res) => courseHttpController.deleteCourse(req, res));
app.put("/courses/:id", (req, res) => courseHttpController.updateCourse(req, res));

const staffHttpController = require("./controllers/staffHttpController");

app.post("/staff", (req, res) => staffHttpController.addStaff(req, res));
app.get("/staff", (req, res) => staffHttpController.getAllStaff(req, res));
app.delete("/staff/:id", (req, res) => staffHttpController.deleteStaff(req, res));
app.put("/staff/:id", (req, res) => staffHttpController.updateStaff(req, res));
app.put("/staff/priority", (req, res) => staffHttpController.updateTaPriorityOrder(req, res));

const messageHttpController = require("./controllers/messageHttpController");

app.post("/messages", (req, res) =>
  messageHttpController.sendMessage(req, res)
);
app.get("/messages/conversation", (req, res) =>
  messageHttpController.getConversation(req, res)
);
app.get("/messages/inbox/:userId", (req, res) =>
  messageHttpController.getInbox(req, res)
);
app.post("/messages/read", (req, res) =>
  messageHttpController.markConversationAsRead(req, res)
);
app.get("/messages/unread/:userId", (req, res) =>
  messageHttpController.getUnreadCount(req, res)
);

const notificationHttpController = require("./controllers/notificationHttpController");

app.get("/notifications/:userId", (req, res) =>
  notificationHttpController.getNotificationsByUser(req, res)
);
app.get("/notifications/unread/:userId", (req, res) =>
  notificationHttpController.getUnreadCount(req, res)
);
app.post("/notifications/read/:id", (req, res) =>
  notificationHttpController.markNotificationAsRead(req, res)
);
app.post("/notifications/read-all/:userId", (req, res) =>
  notificationHttpController.markAllNotificationsAsRead(req, res)
);
app.post("/notifications/send/all", (req, res) =>
  notificationHttpController.sendToAllTAs(req, res)
);
app.post("/notifications/send/one", (req, res) =>
  notificationHttpController.sendToOneUser(req, res)
);
app.post("/notifications/send/multiple", (req, res) =>
  notificationHttpController.sendToSelectedUsers(req, res)
);

const preferenceRoundHttpController = require("./controllers/preferenceRoundHttpController");

app.post("/rounds/open", (req, res) =>
  preferenceRoundHttpController.openRound(req, res)
);
app.post("/rounds/lock", (req, res) =>
  preferenceRoundHttpController.lockRound(req, res)
);
app.get("/rounds/current", (req, res) =>
  preferenceRoundHttpController.getCurrentRound(req, res)
);
app.get("/rounds/submission/:roundId", (req, res) =>
  preferenceRoundHttpController.getSubmissionStatus(req, res)
);

const preferenceHttpController = require("./controllers/preferenceHttpController");

app.post("/preferences", (req, res) =>
  preferenceHttpController.addPreference(req, res)
);
app.get("/preferences/staff/:staffId", (req, res) =>
  preferenceHttpController.getPreferencesByStaff(req, res)
);
app.get("/preferences", (req, res) =>
  preferenceHttpController.getAllPreferences(req, res)
);
app.put("/preferences/:id", (req, res) =>
  preferenceHttpController.updatePreference(req, res)
);
app.post("/preferences/reset/:staffId", (req, res) =>
  preferenceHttpController.resetPreferences(req, res)
);

const HTTP_PORT = process.env.PORT || 3000;

app.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
});

main();
