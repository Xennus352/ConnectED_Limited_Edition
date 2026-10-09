import { ILesson } from "./lesson";

export interface IExam {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  lesson: ILesson;
  results: any[];
  createdAt: string;
  updatedAt: string;
}
