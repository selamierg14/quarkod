-- CreateIndex
CREATE INDEX "checklist_completions_completedById_idx" ON "checklist_completions"("completedById");

-- CreateIndex
CREATE INDEX "coupons_businessId_idx" ON "coupons"("businessId");

-- CreateIndex
CREATE INDEX "coupons_feedbackId_idx" ON "coupons"("feedbackId");

-- CreateIndex
CREATE INDEX "feedbacks_tableId_idx" ON "feedbacks"("tableId");

-- CreateIndex
CREATE INDEX "marketing_consents_feedbackId_idx" ON "marketing_consents"("feedbackId");

-- CreateIndex
CREATE INDEX "notifications_feedbackId_idx" ON "notifications"("feedbackId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "shift_notes_authorId_idx" ON "shift_notes"("authorId");

-- CreateIndex
CREATE INDEX "shift_swap_requests_requestedById_idx" ON "shift_swap_requests"("requestedById");

-- CreateIndex
CREATE INDEX "shift_swap_requests_decidedById_idx" ON "shift_swap_requests"("decidedById");

-- CreateIndex
CREATE INDEX "survey_views_tableId_idx" ON "survey_views"("tableId");

-- CreateIndex
CREATE INDEX "users_businessId_idx" ON "users"("businessId");
