const projectsService = require("../services/projectsService");
const { sendSuccess, sendError } = require("../../../common/http");

const createProject = async (req, res) => {
  try {
    const project = await projectsService.createProject(req.body, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Project created successfully",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listProjects = async (req, res) => {
  try {
    const data = await projectsService.listProjects(req.query);
    return sendSuccess(res, {
      message: "Projects retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await projectsService.getProjectById(req.params.projectId);
    return sendSuccess(res, {
      message: "Project retrieved successfully",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await projectsService.updateProject(
      req.params.projectId,
      req.body,
      req.user
    );
    return sendSuccess(res, {
      message: "Project updated successfully",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
};
