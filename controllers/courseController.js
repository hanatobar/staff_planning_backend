const courseService = require('../services/courseService');

async function addCourse(call, callback){

  try{
      console.log("AddCourse called:", call.request);


    const {name, code, hours, semester} = call.request;

    await courseService.addCourse(
      name,
      code,
      hours,
      semester
    );

    callback(null,{
      message:"Course added successfully"
    });

  }catch(error){

    callback(error,null);

  }

}

async function updateCourse(call, callback) {
  try {
    const { id, name, code, hours, semester } = call.request;

    const result = await courseService.updateCourse(
      id,
      name,
      code,
      hours,
      semester
    );

    callback(null, {
      message: result.message
    });
  } catch (error) {
    callback(error, null);
  }
}



async function getAllCourses(call, callback){

  try{

    const courses = await courseService.getAllCourses();

    callback(null,{
      courses:courses
    });

  }catch(error){

    callback(error,null);

  }

}

async function deleteCourse(call, callback){

  try{

    const {id} = call.request;

    await courseService.deleteCourse(id);

    callback(null,{
      message:"Course deleted successfully"
    });

  }catch(error){

    callback(error,null);

  }

}

module.exports = {
  addCourse,
  getAllCourses,
  deleteCourse,
  updateCourse
};