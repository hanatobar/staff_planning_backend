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



const staffProto = grpc.loadPackageDefinition(staffPackageDefinition).staff;
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
    res.status(500).json({ error: "Login failed" });
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

app.post("/assignments/generate", assignmentHttpController.generatePlan);
app.get("/assignments", assignmentHttpController.getAssignments);
app.get("/assignments/staff/:id", assignmentHttpController.getAssignmentsByStaff);
app.post("/assignments/approve", assignmentHttpController.approvePlan);

app.get("/assignments/analytics", assignmentHttpController.getAnalytics);
app.get("/assignments/conflicts", assignmentHttpController.getConflicts);
app.get("/assignments/non-submitters", assignmentHttpController.getNonSubmitters);
app.get("/assignments/uncovered-hours", assignmentHttpController.getUncoveredHours);

app.post("/assignments/uncovered-hours/assign", assignmentHttpController.assignUncoveredHours);
app.post("/assignments/transfer", assignmentHttpController.transferAssignmentHours);

app.post("/assignments/appeals", assignmentHttpController.submitAppeal);
app.get("/assignments/appeals/staff/:id", assignmentHttpController.getAppealsByStaff);
app.get("/assignments/appeals", assignmentHttpController.getAllAppeals);

app.get("/assignments/appeals/:id", assignmentHttpController.getAppealDetails);
app.post("/assignments/appeals/review", assignmentHttpController.reviewAppeal);
app.post("/assignments/appeals/resolve", assignmentHttpController.resolveAppeal);

const courseRequirementHttpController = require("./controllers/courseRequirementHttpController");

app.post("/course-requirements", courseRequirementHttpController.addRequirement);
app.put("/course-requirements/:id", courseRequirementHttpController.updateRequirement);
app.get("/course-requirements", courseRequirementHttpController.getAllRequirements);

const courseHttpController = require("./controllers/courseHttpController");

app.post("/courses", courseHttpController.addCourse);
app.get("/courses", courseHttpController.getAllCourses);
app.delete("/courses/:id", courseHttpController.deleteCourse);
app.put("/courses/:id", courseHttpController.updateCourse);

const staffHttpController = require("./controllers/staffHttpController");

app.post("/staff", staffHttpController.addStaff);
app.get("/staff", staffHttpController.getAllStaff);
app.delete("/staff/:id", staffHttpController.deleteStaff);
app.put("/staff/:id", staffHttpController.updateStaff);
app.put("/staff/priority", staffHttpController.updateTaPriorityOrder);

const messageHttpController = require("./controllers/messageHttpController");

app.post("/messages", messageHttpController.sendMessage);
app.get("/messages/conversation", messageHttpController.getConversation);
app.get("/messages/inbox/:userId", messageHttpController.getInbox);
app.post("/messages/read", messageHttpController.markConversationAsRead);
app.get("/messages/unread/:userId", messageHttpController.getUnreadCount);

const notificationHttpController = require("./controllers/notificationHttpController");

app.get("/notifications/:userId", notificationHttpController.getNotificationsByUser);
app.get("/notifications/unread/:userId", notificationHttpController.getUnreadCount);

app.post("/notifications/read/:id", notificationHttpController.markNotificationAsRead);
app.post("/notifications/read-all/:userId", notificationHttpController.markAllNotificationsAsRead);

app.post("/notifications/send/all", notificationHttpController.sendToAllTAs);
app.post("/notifications/send/one", notificationHttpController.sendToOneUser);
app.post("/notifications/send/multiple", notificationHttpController.sendToSelectedUsers);

const preferenceRoundHttpController = require("./controllers/preferenceRoundHttpController");

app.post("/rounds/open", preferenceRoundHttpController.openRound);
app.post("/rounds/lock", preferenceRoundHttpController.lockRound);
app.get("/rounds/current", preferenceRoundHttpController.getCurrentRound);
app.get("/rounds/submission/:roundId", preferenceRoundHttpController.getSubmissionStatus);

const preferenceHttpController = require("./controllers/preferenceHttpController");

app.post("/preferences", preferenceHttpController.addPreference);
app.get("/preferences/staff/:staffId", preferenceHttpController.getPreferencesByStaff);
app.get("/preferences", preferenceHttpController.getAllPreferences);
app.put("/preferences/:id", preferenceHttpController.updatePreference);
app.post("/preferences/reset/:staffId", preferenceHttpController.resetPreferences);

const HTTP_PORT = process.env.PORT || 3000;

app.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
});

main();
