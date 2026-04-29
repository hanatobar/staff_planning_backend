const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
require('dotenv').config();


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

const staffPackageDefinition = protoLoader.loadSync('./proto/staff.proto');
const coursePackageDefinition = protoLoader.loadSync('./proto/course.proto');
const preferencePackageDefinition = protoLoader.loadSync('./proto/preference.proto');
const courseRequirementPackageDefinition = protoLoader.loadSync('./proto/course_requirement.proto');
const assignmentPackageDefinition = protoLoader.loadSync('./proto/assignment.proto');
const preferenceRoundPackageDefinition = protoLoader.loadSync('./proto/preference_round.proto');
const notificationPackageDefinition = protoLoader.loadSync('./proto/notification.proto');
const messagePackageDefinition = protoLoader.loadSync('./proto/message.proto');
const authPackageDefinition = protoLoader.loadSync('./proto/auth.proto');



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

const HTTP_PORT = process.env.PORT || 3000;

app.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
});

//main();
