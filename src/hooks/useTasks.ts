"use client";
import { useState, useEffect } from "react";

import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { logger, isIndexBuildingError, getIndexBuildingMessage } from "@/lib/logger";
import type { Task } from "@/types";

import { useUser } from "./useUser";

export function useTasks(shopId?: string, branchId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        let q;
        if (shopId && branchId) {
          // New flat structure: query top-level tasks collection with filters
          q = query(
            collection(db, "tasks"),
            where("shopId", "==", shopId),
            where("branchId", "==", branchId),
            orderBy("createdAt", "desc")
          );
        } else if (shopId) {
          // Query all tasks for the shop
          q = query(
            collection(db, "tasks"),
            where("shopId", "==", shopId),
            orderBy("createdAt", "desc")
          );
        } else {
          setTasks([]);
          setLoading(false);
          return;
        }

        const querySnapshot = await getDocs(q);
        const taskList: Task[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          const task: Task = {
            id: docSnapshot.id,
            title: data.title || "",
            description: data.description || "",
            status: data.status || "pending",
            priority: data.priority || "medium",
            assignedTechnicianId: data.assignedTechnicianId || "",
            dueDate: data.dueDate?.toDate() || new Date(),
            shopId: data.shopId || "",
            branchId: data.branchId || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
          taskList.push(task);
        }

        setTasks(taskList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch tasks";
        
        // Check if it's an index building error
        if (isIndexBuildingError(errorMessage)) {
          setError(getIndexBuildingMessage(errorMessage));
        } else {
          setError(errorMessage);
        }
        
        logger.error("Error fetching tasks", { error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, shopId, branchId]);

  const createTask = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: add to top-level tasks collection
      const taskDocRef = await addDoc(
        collection(db, "tasks"),
        {
          ...taskData,
          shopId, // Ensure shopId is set
          branchId, // Ensure branchId is set
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Refresh tasks list
      const updatedTasks = await getDocs(
        query(
          collection(db, "tasks"),
          where("shopId", "==", shopId),
          where("branchId", "==", branchId),
          orderBy("createdAt", "desc")
        )
      );

      const taskList: Task[] = [];
      for (const docSnapshot of updatedTasks.docs) {
        const data = docSnapshot.data();
        const task: Task = {
          id: docSnapshot.id,
          title: data.title || "",
          description: data.description || "",
          status: data.status || "pending",
          priority: data.priority || "medium",
          assignedTechnicianId: data.assignedTechnicianId || "",
          dueDate: data.dueDate?.toDate() || new Date(),
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        taskList.push(task);
      }

      setTasks(taskList);
      return taskDocRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create task";
      logger.error("Error creating task", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: update in top-level tasks collection
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Refresh tasks list
      const updatedTasks = await getDocs(
        query(
          collection(db, "tasks"),
          where("shopId", "==", shopId),
          where("branchId", "==", branchId),
          orderBy("createdAt", "desc")
        )
      );

      const taskList: Task[] = [];
      for (const docSnapshot of updatedTasks.docs) {
        const data = docSnapshot.data();
        const task: Task = {
          id: docSnapshot.id,
          title: data.title || "",
          description: data.description || "",
          status: data.status || "pending",
          priority: data.priority || "medium",
          assignedTechnicianId: data.assignedTechnicianId || "",
          dueDate: data.dueDate?.toDate() || new Date(),
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        taskList.push(task);
      }

      setTasks(taskList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update task";
      logger.error("Error updating task", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user || !shopId || !branchId) {
      throw new Error("User not authenticated or missing shop/branch ID");
    }

    try {
      // New flat structure: delete from top-level tasks collection
      await deleteDoc(doc(db, "tasks", taskId));
      
      // Refresh tasks list
      const updatedTasks = await getDocs(
        query(
          collection(db, "tasks"),
          where("shopId", "==", shopId),
          where("branchId", "==", branchId),
          orderBy("createdAt", "desc")
        )
      );

      const taskList: Task[] = [];
      for (const docSnapshot of updatedTasks.docs) {
        const data = docSnapshot.data();
        const task: Task = {
          id: docSnapshot.id,
          title: data.title || "",
          description: data.description || "",
          status: data.status || "pending",
          priority: data.priority || "medium",
          assignedTechnicianId: data.assignedTechnicianId || "",
          dueDate: data.dueDate?.toDate() || new Date(),
          shopId: data.shopId || "",
          branchId: data.branchId || "",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        taskList.push(task);
      }

      setTasks(taskList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete task";
      logger.error("Error deleting task", { error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
  };
} 