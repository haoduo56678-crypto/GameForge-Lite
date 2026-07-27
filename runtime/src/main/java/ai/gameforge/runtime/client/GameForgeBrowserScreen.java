package ai.gameforge.runtime.client;

import ai.gameforge.runtime.GameForgeRuntime;
import ai.gameforge.runtime.GameForgeRuntime.ComponentAction;
import ai.gameforge.runtime.GameForgeRuntime.GameForgeComponent;
import ai.gameforge.runtime.GameForgeRuntime.GameForgeProject;
import ai.gameforge.runtime.GameForgeRuntime.ProjectAction;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;
import net.minecraft.util.Mth;
import net.minecraft.world.item.ItemStack;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class GameForgeBrowserScreen extends Screen {
    private static final int BACKGROUND = 0xF2080C17;
    private static final int PANEL = 0xF5111829;
    private static final int PANEL_ALT = 0xF51A2439;
    private static final int CARD = 0xF51D2942;
    private static final int CARD_HOVER = 0xF5263657;
    private static final int BORDER = 0xFF334362;
    private static final int ACCENT = 0xFF80A9FF;
    private static final int ACCENT_PURPLE = 0xFF8C7DFF;
    private static final int TEXT = 0xFFEEF4FF;
    private static final int MUTED = 0xFF9FACBF;
    private static final int SUCCESS = 0xFF77E2AC;
    private static final int WARNING = 0xFFFFD28D;
    private static final int DANGER = 0xFFFF8D9A;

    private final List<HitBox> hitBoxes = new ArrayList<>();
    private final List<HitBox> modalHitBoxes = new ArrayList<>();

    private List<GameForgeProject> projects = List.of();
    private List<ContentEntry> allEntries = List.of();
    private List<ContentEntry> filteredEntries = List.of();
    private ContentEntry selectedEntry;
    private GameForgeProject selectedProject;
    private String projectFilter = "";
    private ViewTab tab = ViewTab.BROWSER;
    private Category category = Category.ALL;
    private EditBox searchBox;
    private int gridScrollRows;
    private int projectScroll;
    private Rect gridBounds = Rect.EMPTY;
    private Rect projectBounds = Rect.EMPTY;
    private ContentEntry recipeEntry;
    private ItemStack hoveredStack = ItemStack.EMPTY;
    private String status = tr("screen.gameforge_runtime.status.ready");
    private int statusColor = MUTED;

    public GameForgeBrowserScreen() {
        super(Component.translatable("screen.gameforge_runtime.title"));
        refreshProjects();
    }

    @Override
    protected void init() {
        Layout layout = layout();
        searchBox = new EditBox(
            this.font,
            layout.contentX() + 18,
            layout.panelY() + 58,
            Math.max(150, layout.contentW() - 36),
            22,
            Component.translatable("screen.gameforge_runtime.search_content")
        );
        searchBox.setHint(Component.translatable("screen.gameforge_runtime.search_content"));
        searchBox.setMaxLength(100);
        searchBox.setResponder(query -> rebuildFilteredEntries());
        searchBox.setVisible(tab == ViewTab.BROWSER);
        this.addRenderableWidget(searchBox);
    }

    private void refreshProjects() {
        projects = GameForgeRuntime.ProjectCatalog.scan();
        List<ContentEntry> entries = new ArrayList<>();
        for (GameForgeProject project : projects) {
            for (GameForgeComponent component : project.components()) {
                entries.add(new ContentEntry(project, component));
            }
        }
        allEntries = List.copyOf(entries);
        if (selectedProject == null || projects.stream().noneMatch(project -> project.namespace().equals(selectedProject.namespace()))) {
            selectedProject = projects.isEmpty() ? null : projects.get(0);
        }
        if (!projectFilter.isBlank() && projects.stream().noneMatch(project -> project.namespace().equals(projectFilter))) {
            projectFilter = "";
        }
        rebuildFilteredEntries();
        status = projects.isEmpty()
            ? tr("screen.gameforge_runtime.empty")
            : tr("screen.gameforge_runtime.status.detected", projects.size(), allEntries.size());
        statusColor = projects.isEmpty() ? WARNING : SUCCESS;
    }

    private void rebuildFilteredEntries() {
        String query = searchBox == null ? "" : searchBox.getValue().trim().toLowerCase(Locale.ROOT);
        filteredEntries = allEntries.stream()
            .filter(entry -> projectFilter.isBlank() || entry.project().namespace().equals(projectFilter))
            .filter(entry -> category.matches(entry.component()))
            .filter(entry -> query.isBlank() || entry.component().searchableText(
                entry.project().name(),
                entry.project().namespace()
            ).contains(query))
            .toList();

        if (selectedEntry == null || !filteredEntries.contains(selectedEntry)) {
            selectedEntry = filteredEntries.isEmpty() ? null : filteredEntries.get(0);
        }
        gridScrollRows = 0;
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        hitBoxes.clear();
        modalHitBoxes.clear();
        hoveredStack = ItemStack.EMPTY;
        gridBounds = Rect.EMPTY;
        projectBounds = Rect.EMPTY;

        graphics.fill(0, 0, this.width, this.height, BACKGROUND);
        graphics.fillGradient(0, 0, this.width, Math.max(80, this.height / 3), 0x553E5FCB, 0x00080C17);

        Layout layout = layout();
        drawShell(graphics, layout);
        drawSidebar(graphics, mouseX, mouseY, layout);
        drawHeader(graphics, layout);

        switch (tab) {
            case BROWSER -> drawBrowser(graphics, mouseX, mouseY, layout);
            case PROJECTS -> drawProjects(graphics, mouseX, mouseY, layout);
            case DIAGNOSTICS -> drawDiagnostics(graphics, mouseX, mouseY, layout);
            case HELP -> drawHelp(graphics, mouseX, mouseY, layout);
        }

        drawFooter(graphics, layout);
        super.render(graphics, mouseX, mouseY, partialTick);

        if (recipeEntry != null) {
            drawRecipeModal(graphics, mouseX, mouseY, recipeEntry, layout);
        }
        if (!hoveredStack.isEmpty()) {
            graphics.renderTooltip(this.font, hoveredStack, mouseX, mouseY);
        }
    }

    private void drawShell(GuiGraphics graphics, Layout layout) {
        graphics.fill(
            layout.panelX() - 5,
            layout.panelY() + 5,
            layout.panelX() + layout.panelW() + 5,
            layout.panelY() + layout.panelH() + 9,
            0x66000000
        );
        graphics.fill(
            layout.panelX() - 1,
            layout.panelY() - 1,
            layout.panelX() + layout.panelW() + 1,
            layout.panelY() + layout.panelH() + 1,
            BORDER
        );
        graphics.fill(
            layout.panelX(),
            layout.panelY(),
            layout.panelX() + layout.panelW(),
            layout.panelY() + layout.panelH(),
            PANEL
        );
        graphics.fill(
            layout.panelX(),
            layout.panelY(),
            layout.panelX() + layout.sidebarW(),
            layout.panelY() + layout.panelH(),
            PANEL_ALT
        );
        graphics.fill(
            layout.panelX() + layout.sidebarW() - 1,
            layout.panelY(),
            layout.panelX() + layout.sidebarW(),
            layout.panelY() + layout.panelH(),
            BORDER
        );
    }

    private void drawSidebar(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int logoX = layout.panelX() + 15;
        int logoY = layout.panelY() + 15;
        graphics.fill(logoX, logoY, logoX + 30, logoY + 30, ACCENT_PURPLE);
        graphics.fill(logoX + 2, logoY + 2, logoX + 28, logoY + 28, 0xFF111829);
        graphics.drawCenteredString(this.font, "GF", logoX + 15, logoY + 11, ACCENT);
        graphics.drawString(this.font, "GAMEFORGE", logoX + 38, logoY + 4, TEXT, false);
        graphics.drawString(this.font, "RUNTIME 0.2", logoX + 38, logoY + 17, ACCENT, false);
        graphics.fill(
            layout.panelX() + 13,
            layout.panelY() + 56,
            layout.panelX() + layout.sidebarW() - 13,
            layout.panelY() + 57,
            BORDER
        );

        int y = layout.panelY() + 69;
        for (ViewTab candidate : ViewTab.values()) {
            int x = layout.panelX() + 10;
            int width = layout.sidebarW() - 20;
            boolean active = tab == candidate;
            boolean hovered = inside(mouseX, mouseY, x, y, width, 27);
            graphics.fill(x, y, x + width, y + 27, active ? 0xFF263A62 : hovered ? 0xFF202F4D : 0x00111829);
            if (active) graphics.fill(x, y, x + 3, y + 27, ACCENT);
            graphics.drawString(this.font, candidate.icon, x + 9, y + 9, active ? ACCENT : MUTED, false);
            graphics.drawString(this.font, Component.translatable(candidate.key), x + 27, y + 9, active ? TEXT : MUTED, false);
            hitBoxes.add(new HitBox(x, y, width, 27, () -> switchTab(candidate)));
            y += 32;
        }

        y += 5;
        graphics.fill(
            layout.panelX() + 13,
            y,
            layout.panelX() + layout.sidebarW() - 13,
            y + 1,
            BORDER
        );
        y += 10;
        graphics.drawString(this.font, tr("screen.gameforge_runtime.project_filter"), layout.panelX() + 14, y, MUTED, false);
        y += 15;

        int projectListBottom = layout.panelY() + layout.panelH() - 57;
        drawProjectFilterButton(graphics, mouseX, mouseY, layout.panelX() + 10, y, layout.sidebarW() - 20, "", tr("screen.gameforge_runtime.all_projects"), allEntries.size());
        y += 29;
        for (GameForgeProject project : projects) {
            if (y + 27 > projectListBottom) break;
            drawProjectFilterButton(
                graphics,
                mouseX,
                mouseY,
                layout.panelX() + 10,
                y,
                layout.sidebarW() - 20,
                project.namespace(),
                project.name(),
                project.componentCount()
            );
            y += 29;
        }

        drawButton(
            graphics,
            mouseX,
            mouseY,
            layout.panelX() + 12,
            layout.panelY() + layout.panelH() - 42,
            layout.sidebarW() - 24,
            27,
            tr("screen.gameforge_runtime.close"),
            ButtonKind.SECONDARY,
            this::onClose,
            true,
            hitBoxes
        );
    }

    private void drawProjectFilterButton(
        GuiGraphics graphics,
        int mouseX,
        int mouseY,
        int x,
        int y,
        int width,
        String namespace,
        String label,
        int count
    ) {
        boolean active = projectFilter.equals(namespace);
        boolean hovered = inside(mouseX, mouseY, x, y, width, 25);
        graphics.fill(x, y, x + width, y + 25, active ? 0xFF263650 : hovered ? 0xFF202F4D : 0x00111829);
        if (active) graphics.fill(x, y, x + 3, y + 25, ACCENT_PURPLE);
        String clipped = this.font.plainSubstrByWidth(label, Math.max(20, width - 38));
        graphics.drawString(this.font, clipped, x + 8, y + 8, active ? TEXT : MUTED, false);
        String countText = Integer.toString(count);
        graphics.drawString(this.font, countText, x + width - this.font.width(countText) - 7, y + 8, active ? ACCENT : MUTED, false);
        hitBoxes.add(new HitBox(x, y, width, 25, () -> {
            projectFilter = namespace;
            rebuildFilteredEntries();
            status = namespace.isBlank()
                ? tr("screen.gameforge_runtime.status.all_projects")
                : tr("screen.gameforge_runtime.status.project_filter", label);
            statusColor = ACCENT;
        }));
    }

    private void drawHeader(GuiGraphics graphics, Layout layout) {
        graphics.drawString(this.font, Component.translatable(tab.key), layout.contentX() + 18, layout.panelY() + 18, TEXT, false);
        graphics.drawString(this.font, Component.translatable(tab.subtitleKey), layout.contentX() + 18, layout.panelY() + 33, MUTED, false);
        graphics.fill(
            layout.contentX() + 16,
            layout.panelY() + 48,
            layout.contentX() + layout.contentW() - 16,
            layout.panelY() + 49,
            BORDER
        );
    }

    private void drawBrowser(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int categoryY = layout.panelY() + 87;
        int categoryX = layout.contentX() + 18;
        for (Category candidate : Category.values()) {
            int width = Math.max(48, this.font.width(tr(candidate.key)) + 18);
            boolean active = category == candidate;
            drawButton(
                graphics,
                mouseX,
                mouseY,
                categoryX,
                categoryY,
                width,
                23,
                tr(candidate.key),
                active ? ButtonKind.PRIMARY : ButtonKind.SECONDARY,
                () -> {
                    category = candidate;
                    rebuildFilteredEntries();
                },
                true,
                hitBoxes
            );
            categoryX += width + 6;
            if (categoryX > layout.contentX() + layout.contentW() - 70) break;
        }

        int bodyTop = categoryY + 31;
        int bodyBottom = layout.panelY() + layout.panelH() - 34;
        int detailWidth = Mth.clamp(layout.contentW() * 36 / 100, 220, 330);
        int gridX = layout.contentX() + 18;
        int gridWidth = layout.contentW() - detailWidth - 48;
        int detailX = gridX + gridWidth + 12;
        int bodyHeight = bodyBottom - bodyTop;

        graphics.fill(gridX, bodyTop, gridX + gridWidth, bodyBottom, 0x99101829);
        graphics.fill(detailX, bodyTop, detailX + detailWidth, bodyBottom, 0x99141D30);
        gridBounds = new Rect(gridX, bodyTop, gridWidth, bodyHeight);

        drawContentGrid(graphics, mouseX, mouseY, gridX, bodyTop, gridWidth, bodyHeight);
        drawContentDetails(graphics, mouseX, mouseY, detailX, bodyTop, detailWidth, bodyHeight);
    }

    private void drawContentGrid(GuiGraphics graphics, int mouseX, int mouseY, int x, int y, int width, int height) {
        if (filteredEntries.isEmpty()) {
            graphics.drawCenteredString(this.font, tr("screen.gameforge_runtime.no_content"), x + width / 2, y + 45, TEXT);
            graphics.drawCenteredString(this.font, tr("screen.gameforge_runtime.no_content_hint"), x + width / 2, y + 64, MUTED);
            return;
        }

        int cellW = 43;
        int cellH = 50;
        int columns = Math.max(2, (width - 10) / cellW);
        int visibleRows = Math.max(1, (height - 10) / cellH);
        int totalRows = (filteredEntries.size() + columns - 1) / columns;
        int maxScrollRows = Math.max(0, totalRows - visibleRows);
        gridScrollRows = Mth.clamp(gridScrollRows, 0, maxScrollRows);
        int startIndex = gridScrollRows * columns;
        int endIndex = Math.min(filteredEntries.size(), startIndex + visibleRows * columns);

        graphics.enableScissor(x, y, x + width, y + height);
        for (int index = startIndex; index < endIndex; index++) {
            int local = index - startIndex;
            int col = local % columns;
            int row = local / columns;
            int cellX = x + 6 + col * cellW;
            int cellY = y + 6 + row * cellH;
            ContentEntry entry = filteredEntries.get(index);
            boolean selected = entry.equals(selectedEntry);
            boolean hovered = inside(mouseX, mouseY, cellX, cellY, cellW - 4, cellH - 4);
            graphics.fill(cellX, cellY, cellX + cellW - 4, cellY + cellH - 4, selected ? 0xFF263A62 : hovered ? CARD_HOVER : CARD);
            if (selected) {
                graphics.fill(cellX, cellY, cellX + cellW - 4, cellY + 2, ACCENT);
            }

            ItemStack stack = GameForgeItemFactory.componentStack(entry.project(), entry.component());
            renderLargeItem(graphics, stack, cellX + 8, cellY + 5, 1.35f);
            String clippedName = this.font.plainSubstrByWidth(entry.component().name(), cellW - 8);
            graphics.drawCenteredString(this.font, clippedName, cellX + (cellW - 4) / 2, cellY + 34, selected ? TEXT : MUTED);
            if (hovered) hoveredStack = stack;
            hitBoxes.add(new HitBox(cellX, cellY, cellW - 4, cellH - 4, () -> {
                selectedEntry = entry;
                selectedProject = entry.project();
                status = tr("screen.gameforge_runtime.status.selected", entry.component().name());
                statusColor = ACCENT;
            }));
        }
        graphics.disableScissor();

        if (totalRows > visibleRows) {
            int trackX = x + width - 4;
            int trackY = y + 5;
            int trackH = height - 10;
            int thumbH = Math.max(18, trackH * visibleRows / totalRows);
            int thumbY = trackY + (trackH - thumbH) * gridScrollRows / Math.max(1, maxScrollRows);
            graphics.fill(trackX, trackY, trackX + 2, trackY + trackH, 0x552E3B55);
            graphics.fill(trackX, thumbY, trackX + 2, thumbY + thumbH, ACCENT);
        }
    }

    private void drawContentDetails(GuiGraphics graphics, int mouseX, int mouseY, int x, int y, int width, int height) {
        if (selectedEntry == null) {
            graphics.drawCenteredString(this.font, tr("screen.gameforge_runtime.select_content"), x + width / 2, y + 38, MUTED);
            return;
        }

        GameForgeProject project = selectedEntry.project();
        GameForgeComponent component = selectedEntry.component();
        ItemStack stack = GameForgeItemFactory.componentStack(project, component);
        graphics.fill(x, y, x + width, y + 3, ACCENT_PURPLE);
        renderLargeItem(graphics, stack, x + 16, y + 15, 2f);
        if (inside(mouseX, mouseY, x + 12, y + 11, 40, 40)) hoveredStack = stack;

        graphics.drawString(this.font, this.font.plainSubstrByWidth(component.name(), width - 72), x + 58, y + 18, TEXT, false);
        graphics.drawString(this.font, GameForgeItemFactory.typeLabel(component) + " · " + project.name(), x + 58, y + 34, ACCENT, false);
        graphics.drawString(this.font, project.namespace() + ":" + component.logicalId(), x + 16, y + 58, MUTED, false);

        int textY = y + 78;
        if (!component.lore().isBlank()) {
            for (FormattedCharSequence line : this.font.split(Component.literal(component.lore()), Math.max(100, width - 32))) {
                graphics.drawString(this.font, line, x + 16, textY, MUTED);
                textY += 11;
                if (textY > y + 116) break;
            }
        }

        List<String> stats = componentStats(component);
        textY = Math.max(textY + 5, y + 124);
        for (String stat : stats) {
            if (textY > y + height - 142) break;
            graphics.drawString(this.font, "• " + stat, x + 16, textY, 0xFFC7D4E8, false);
            textY += 13;
        }

        int buttonY = y + height - 126;
        int gap = 7;
        int half = Math.max(80, (width - 32 - gap) / 2);
        boolean canGive = component.itemLike();
        boolean canSpawn = component.entityLike();
        String primaryText = canSpawn
            ? tr("screen.gameforge_runtime.spawn_one")
            : tr("screen.gameforge_runtime.get_one");
        drawButton(
            graphics, mouseX, mouseY, x + 16, buttonY, width - 32, 28,
            primaryText,
            ButtonKind.PRIMARY,
            () -> runComponentAction(canSpawn ? ComponentAction.SPAWN : ComponentAction.GIVE),
            canGive || canSpawn,
            hitBoxes
        );
        buttonY += 35;
        drawButton(
            graphics, mouseX, mouseY, x + 16, buttonY, half, 27,
            tr("screen.gameforge_runtime.view_recipe"),
            ButtonKind.SUCCESS,
            () -> recipeEntry = selectedEntry,
            component.hasRecipe(),
            hitBoxes
        );
        drawButton(
            graphics, mouseX, mouseY, x + 16 + half + gap, buttonY, half, 27,
            tr("screen.gameforge_runtime.project_menu_short"),
            ButtonKind.SECONDARY,
            () -> runProjectAction(ProjectAction.MENU, project),
            true,
            hitBoxes
        );
        buttonY += 34;
        drawButton(
            graphics, mouseX, mouseY, x + 16, buttonY, half, 27,
            tr("screen.gameforge_runtime.get_all_short"),
            ButtonKind.SECONDARY,
            () -> runProjectAction(ProjectAction.GET_ALL, project),
            true,
            hitBoxes
        );
        drawButton(
            graphics, mouseX, mouseY, x + 16 + half + gap, buttonY, half, 27,
            tr("screen.gameforge_runtime.doctor_short"),
            ButtonKind.SUCCESS,
            () -> runProjectAction(ProjectAction.DOCTOR, project),
            true,
            hitBoxes
        );
    }

    private List<String> componentStats(GameForgeComponent component) {
        List<String> stats = new ArrayList<>();
        if (!component.baseItem().isBlank()) stats.add(tr("screen.gameforge_runtime.stat.base", component.baseItem()));
        if (component.modelData() > 0) stats.add("CustomModelData: " + component.modelData());
        if (component.damage() > 0) stats.add(tr("screen.gameforge_runtime.stat.damage", compactNumber(component.damage())));
        if (component.attackSpeed() > 0) stats.add(tr("screen.gameforge_runtime.stat.speed", compactNumber(component.attackSpeed())));
        if (component.health() > 0) stats.add(tr("screen.gameforge_runtime.stat.health", compactNumber(component.health())));
        if (component.armor() > 0) stats.add(tr("screen.gameforge_runtime.stat.armor", compactNumber(component.armor())));
        if (component.hunger() > 0) stats.add(tr("screen.gameforge_runtime.stat.hunger", component.hunger()));
        if (!component.trigger().isBlank()) stats.add(tr("screen.gameforge_runtime.stat.trigger", GameForgeItemFactory.triggerLabel(component.trigger())));
        if (!component.effect().isBlank() && !component.effect().equalsIgnoreCase("none")) {
            stats.add(tr("screen.gameforge_runtime.stat.effect", GameForgeItemFactory.effectLabel(component.effect())));
        }
        if (component.cooldown() > 0) stats.add(tr("screen.gameforge_runtime.stat.cooldown", component.cooldown()));
        if (component.range() > 0) stats.add(tr("screen.gameforge_runtime.stat.range", component.range()));
        if (component.power() > 0) stats.add(tr("screen.gameforge_runtime.stat.power", component.power()));
        if (component.glow()) stats.add(tr("screen.gameforge_runtime.stat.glow"));
        if (component.unbreakable()) stats.add(tr("screen.gameforge_runtime.stat.unbreakable"));
        if (component.hasRecipe()) stats.add(tr("screen.gameforge_runtime.stat.recipe"));
        return stats;
    }

    private void drawProjects(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int bodyTop = layout.panelY() + 62;
        int bodyBottom = layout.panelY() + layout.panelH() - 34;
        int listWidth = Mth.clamp(layout.contentW() * 40 / 100, 230, 330);
        int listX = layout.contentX() + 18;
        int detailX = listX + listWidth + 12;
        int detailW = layout.contentX() + layout.contentW() - 18 - detailX;
        projectBounds = new Rect(listX, bodyTop, listWidth, bodyBottom - bodyTop);

        graphics.fill(listX, bodyTop, listX + listWidth, bodyBottom, 0x99101829);
        graphics.fill(detailX, bodyTop, detailX + detailW, bodyBottom, 0x99141D30);

        if (projects.isEmpty()) {
            graphics.drawCenteredString(this.font, tr("screen.gameforge_runtime.empty"), layout.contentX() + layout.contentW() / 2, bodyTop + 50, TEXT);
            return;
        }

        int cardH = 61;
        int visible = Math.max(1, (bodyBottom - bodyTop - 8) / cardH);
        int maxScroll = Math.max(0, projects.size() - visible);
        projectScroll = Mth.clamp(projectScroll, 0, maxScroll);
        int y = bodyTop + 5;
        for (int index = projectScroll; index < Math.min(projects.size(), projectScroll + visible); index++) {
            GameForgeProject project = projects.get(index);
            boolean active = selectedProject != null && project.namespace().equals(selectedProject.namespace());
            boolean hovered = inside(mouseX, mouseY, listX + 6, y, listWidth - 12, 55);
            graphics.fill(listX + 6, y, listX + listWidth - 6, y + 55, active ? 0xFF263A62 : hovered ? CARD_HOVER : CARD);
            if (active) graphics.fill(listX + 6, y, listX + 9, y + 55, ACCENT);
            graphics.drawString(this.font, this.font.plainSubstrByWidth(project.name(), listWidth - 30), listX + 15, y + 9, TEXT, false);
            graphics.drawString(this.font, project.namespace(), listX + 15, y + 24, ACCENT, false);
            graphics.drawString(this.font, project.compactSummary(), listX + 15, y + 39, MUTED, false);
            hitBoxes.add(new HitBox(listX + 6, y, listWidth - 12, 55, () -> selectedProject = project));
            y += cardH;
        }

        drawProjectDetails(graphics, mouseX, mouseY, detailX, bodyTop, detailW, bodyBottom - bodyTop);
    }

    private void drawProjectDetails(GuiGraphics graphics, int mouseX, int mouseY, int x, int y, int width, int height) {
        if (selectedProject == null) {
            graphics.drawCenteredString(this.font, tr("screen.gameforge_runtime.select_project"), x + width / 2, y + 40, MUTED);
            return;
        }

        graphics.fill(x, y, x + width, y + 3, ACCENT_PURPLE);
        graphics.drawString(this.font, selectedProject.name(), x + 18, y + 18, TEXT, false);
        graphics.drawString(this.font, selectedProject.namespace(), x + 18, y + 34, ACCENT, false);
        graphics.drawString(this.font, selectedProject.compactSummary(), x + 18, y + 50, MUTED, false);
        int textY = y + 74;
        for (FormattedCharSequence line : this.font.split(Component.literal(selectedProject.description()), Math.max(100, width - 36))) {
            graphics.drawString(this.font, line, x + 18, textY, MUTED);
            textY += 11;
            if (textY > y + 118) break;
        }

        int buttonY = y + 136;
        int gap = 8;
        int half = Math.max(80, (width - 36 - gap) / 2);
        drawButton(graphics, mouseX, mouseY, x + 18, buttonY, half, 28, tr("screen.gameforge_runtime.menu"), ButtonKind.PRIMARY, () -> runProjectAction(ProjectAction.MENU, selectedProject), true, hitBoxes);
        drawButton(graphics, mouseX, mouseY, x + 18 + half + gap, buttonY, half, 28, tr("screen.gameforge_runtime.get_all"), ButtonKind.PRIMARY, () -> runProjectAction(ProjectAction.GET_ALL, selectedProject), true, hitBoxes);
        buttonY += 36;
        drawButton(graphics, mouseX, mouseY, x + 18, buttonY, half, 28, tr("screen.gameforge_runtime.spawn_all"), ButtonKind.SECONDARY, () -> runProjectAction(ProjectAction.SPAWN_ALL, selectedProject), true, hitBoxes);
        drawButton(graphics, mouseX, mouseY, x + 18 + half + gap, buttonY, half, 28, tr("screen.gameforge_runtime.doctor"), ButtonKind.SUCCESS, () -> runProjectAction(ProjectAction.DOCTOR, selectedProject), true, hitBoxes);
        buttonY += 36;
        drawButton(graphics, mouseX, mouseY, x + 18, buttonY, width - 36, 28, tr("screen.gameforge_runtime.cleanup"), ButtonKind.DANGER, () -> runProjectAction(ProjectAction.CLEANUP, selectedProject), true, hitBoxes);
        buttonY += 42;
        drawButton(graphics, mouseX, mouseY, x + 18, buttonY, width - 36, 28, tr("screen.gameforge_runtime.browse_project_content"), ButtonKind.SECONDARY, () -> {
            projectFilter = selectedProject.namespace();
            switchTab(ViewTab.BROWSER);
            rebuildFilteredEntries();
        }, true, hitBoxes);
    }

    private void drawDiagnostics(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int x = layout.contentX() + 20;
        int y = layout.panelY() + 66;
        int width = layout.contentW() - 40;
        int cardW = Math.max(150, (width - 20) / 3);
        drawMetric(graphics, x, y, cardW, tr("screen.gameforge_runtime.metric.projects"), Integer.toString(projects.size()), SUCCESS);
        drawMetric(graphics, x + cardW + 10, y, cardW, tr("screen.gameforge_runtime.metric.components"), Integer.toString(allEntries.size()), ACCENT);
        drawMetric(graphics, x + (cardW + 10) * 2, y, cardW, tr("screen.gameforge_runtime.metric.recipes"), Long.toString(allEntries.stream().filter(entry -> entry.component().hasRecipe()).count()), ACCENT_PURPLE);

        y += 74;
        graphics.fill(x, y, x + width, y + 1, BORDER);
        y += 14;
        drawCheck(graphics, x, y, true, tr("screen.gameforge_runtime.check.minecraft"));
        y += 23;
        drawCheck(graphics, x, y, true, tr("screen.gameforge_runtime.check.forge"));
        y += 23;
        drawCheck(graphics, x, y, true, tr("screen.gameforge_runtime.check.runtime", GameForgeRuntime.VERSION));
        y += 23;
        drawCheck(graphics, x, y, !projects.isEmpty(), projects.isEmpty()
            ? tr("screen.gameforge_runtime.check.no_projects")
            : tr("screen.gameforge_runtime.check.projects", projects.size()));
        y += 23;

        Set<String> duplicateNamespaces = duplicateNamespaces();
        drawCheck(graphics, x, y, duplicateNamespaces.isEmpty(), duplicateNamespaces.isEmpty()
            ? tr("screen.gameforge_runtime.check.no_duplicates")
            : tr("screen.gameforge_runtime.check.duplicates", String.join(", ", duplicateNamespaces)));
        y += 36;

        int buttonW = Math.min(240, width);
        drawButton(graphics, mouseX, mouseY, x, y, buttonW, 29, tr("screen.gameforge_runtime.refresh"), ButtonKind.PRIMARY, this::refreshProjects, true, hitBoxes);
        if (selectedProject != null) {
            drawButton(graphics, mouseX, mouseY, x + buttonW + 10, y, buttonW, 29, tr("screen.gameforge_runtime.doctor"), ButtonKind.SUCCESS, () -> runProjectAction(ProjectAction.DOCTOR, selectedProject), true, hitBoxes);
        }
    }

    private Set<String> duplicateNamespaces() {
        Set<String> seen = new HashSet<>();
        Set<String> duplicates = new HashSet<>();
        for (GameForgeProject project : projects) {
            if (!seen.add(project.namespace())) duplicates.add(project.namespace());
        }
        return duplicates;
    }

    private void drawMetric(GuiGraphics graphics, int x, int y, int width, String label, String value, int color) {
        graphics.fill(x, y, x + width, y + 58, CARD);
        graphics.fill(x, y, x + 3, y + 58, color);
        graphics.drawString(this.font, label, x + 13, y + 11, MUTED, false);
        graphics.drawString(this.font, value, x + 13, y + 29, color, false);
    }

    private void drawCheck(GuiGraphics graphics, int x, int y, boolean okay, String text) {
        graphics.fill(x, y, x + 17, y + 17, okay ? SUCCESS : DANGER);
        graphics.drawCenteredString(this.font, okay ? "✓" : "!", x + 8, y + 5, 0xFF07101F);
        graphics.drawString(this.font, text, x + 26, y + 5, okay ? 0xFFCFE8DB : 0xFFFFBCC4, false);
    }

    private void drawHelp(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int x = layout.contentX() + 22;
        int y = layout.panelY() + 68;
        int width = layout.contentW() - 44;
        graphics.drawString(this.font, tr("screen.gameforge_runtime.help_title"), x, y, TEXT, false);
        y += 23;
        for (String line : List.of(
            tr("screen.gameforge_runtime.help_1"),
            tr("screen.gameforge_runtime.help_2"),
            tr("screen.gameforge_runtime.help_3"),
            tr("screen.gameforge_runtime.help_4"),
            tr("screen.gameforge_runtime.help_5")
        )) {
            graphics.fill(x, y, x + width, y + 36, CARD);
            graphics.fill(x, y, x + 3, y + 36, ACCENT);
            graphics.drawString(this.font, line, x + 14, y + 14, 0xFFC7D4E8, false);
            y += 43;
        }
        y += 8;
        drawButton(graphics, mouseX, mouseY, x, y, Math.min(220, width), 29, tr("screen.gameforge_runtime.open_browser"), ButtonKind.PRIMARY, () -> switchTab(ViewTab.BROWSER), true, hitBoxes);
        drawButton(graphics, mouseX, mouseY, x + Math.min(220, width) + 10, y, Math.min(220, width), 29, tr("screen.gameforge_runtime.refresh"), ButtonKind.SECONDARY, this::refreshProjects, true, hitBoxes);
    }

    private void drawFooter(GuiGraphics graphics, Layout layout) {
        int footerY = layout.panelY() + layout.panelH() - 28;
        graphics.fill(layout.contentX(), footerY, layout.panelX() + layout.panelW(), layout.panelY() + layout.panelH(), 0xCC0D1423);
        graphics.drawString(this.font, this.font.plainSubstrByWidth(status, Math.max(80, layout.contentW() - 300)), layout.contentX() + 13, footerY + 10, statusColor, false);
        String version = "Minecraft 1.20.1 · Forge 47.x · Runtime " + GameForgeRuntime.VERSION;
        graphics.drawString(this.font, version, layout.panelX() + layout.panelW() - this.font.width(version) - 10, footerY + 10, MUTED, false);
    }

    private void drawRecipeModal(GuiGraphics graphics, int mouseX, int mouseY, ContentEntry entry, Layout layout) {
        graphics.fill(0, 0, this.width, this.height, 0xB0000000);
        int cardW = Math.min(540, this.width - 24);
        int cardH = Math.min(360, this.height - 24);
        int cardX = (this.width - cardW) / 2;
        int cardY = (this.height - cardH) / 2;
        graphics.fill(cardX - 1, cardY - 1, cardX + cardW + 1, cardY + cardH + 1, BORDER);
        graphics.fill(cardX, cardY, cardX + cardW, cardY + cardH, PANEL);
        graphics.fill(cardX, cardY, cardX + cardW, cardY + 4, ACCENT_PURPLE);

        GameForgeComponent component = entry.component();
        GameForgeProject project = entry.project();
        graphics.drawString(this.font, tr("screen.gameforge_runtime.recipe_title", component.name()), cardX + 20, cardY + 18, TEXT, false);
        graphics.drawString(this.font, tr("screen.gameforge_runtime.recipe_subtitle"), cardX + 20, cardY + 34, MUTED, false);

        int slotSize = 34;
        int gridX = cardX + 35;
        int gridY = cardY + 72;
        List<String> recipe = component.recipeGrid();
        for (int index = 0; index < 9; index++) {
            int col = index % 3;
            int row = index / 3;
            int slotX = gridX + col * (slotSize + 3);
            int slotY = gridY + row * (slotSize + 3);
            graphics.fill(slotX, slotY, slotX + slotSize, slotY + slotSize, 0xFF0D1423);
            graphics.fill(slotX + 1, slotY + 1, slotX + slotSize - 1, slotY + slotSize - 1, 0xFF1A2439);
            ItemStack ingredient = index < recipe.size()
                ? GameForgeItemFactory.ingredientStack(recipe.get(index))
                : ItemStack.EMPTY;
            if (!ingredient.isEmpty()) {
                renderLargeItem(graphics, ingredient, slotX + 6, slotY + 6, 1.35f);
                if (inside(mouseX, mouseY, slotX, slotY, slotSize, slotSize)) hoveredStack = ingredient;
            }
        }

        graphics.drawCenteredString(this.font, "→", gridX + 139, gridY + 42, ACCENT);
        int outputX = gridX + 169;
        int outputY = gridY + 37;
        graphics.fill(outputX, outputY, outputX + 46, outputY + 46, 0xFF0D1423);
        graphics.fill(outputX + 1, outputY + 1, outputX + 45, outputY + 45, 0xFF263A62);
        ItemStack output = GameForgeItemFactory.componentStack(project, component);
        renderLargeItem(graphics, output, outputX + 11, outputY + 11, 1.55f);
        if (inside(mouseX, mouseY, outputX, outputY, 46, 46)) hoveredStack = output;

        int infoX = outputX + 67;
        int infoY = gridY + 6;
        graphics.drawString(this.font, component.name(), infoX, infoY, TEXT, false);
        graphics.drawString(this.font, project.name(), infoX, infoY + 16, ACCENT, false);
        graphics.drawString(this.font, project.namespace() + ":" + component.logicalId(), infoX, infoY + 32, MUTED, false);
        graphics.drawString(this.font, tr("screen.gameforge_runtime.recipe_note"), infoX, infoY + 58, WARNING, false);
        int wrappedY = infoY + 74;
        for (FormattedCharSequence line : this.font.split(Component.translatable("screen.gameforge_runtime.recipe_note_detail"), Math.max(100, cardX + cardW - infoX - 20))) {
            graphics.drawString(this.font, line, infoX, wrappedY, MUTED);
            wrappedY += 11;
        }

        int buttonY = cardY + cardH - 47;
        int buttonW = Math.min(190, (cardW - 52) / 2);
        drawButton(
            graphics, mouseX, mouseY, cardX + 18, buttonY, buttonW, 29,
            tr("screen.gameforge_runtime.get_one"),
            ButtonKind.PRIMARY,
            () -> runComponentAction(ComponentAction.GIVE),
            component.itemLike(),
            modalHitBoxes
        );
        drawButton(
            graphics, mouseX, mouseY, cardX + cardW - buttonW - 18, buttonY, buttonW, 29,
            tr("screen.gameforge_runtime.close_recipe"),
            ButtonKind.SECONDARY,
            () -> recipeEntry = null,
            true,
            modalHitBoxes
        );
    }

    private void switchTab(ViewTab newTab) {
        tab = newTab;
        if (searchBox != null) {
            searchBox.setVisible(tab == ViewTab.BROWSER);
            searchBox.setFocused(false);
        }
        status = switch (newTab) {
            case BROWSER -> tr("screen.gameforge_runtime.status.browser");
            case PROJECTS -> tr("screen.gameforge_runtime.status.projects");
            case DIAGNOSTICS -> tr("screen.gameforge_runtime.status.diagnostics");
            case HELP -> tr("screen.gameforge_runtime.status.help");
        };
        statusColor = newTab == ViewTab.DIAGNOSTICS ? SUCCESS : MUTED;
    }

    private void runProjectAction(ProjectAction action, GameForgeProject project) {
        if (project == null) return;
        GameForgeRuntime.sendAction(project.namespace(), action);
        status = tr("message.gameforge_runtime.sent", action.displayName());
        statusColor = ACCENT;
    }

    private void runComponentAction(ComponentAction action) {
        ContentEntry entry = recipeEntry != null ? recipeEntry : selectedEntry;
        if (entry == null) return;
        GameForgeRuntime.sendComponentAction(entry.project().namespace(), entry.component().logicalId(), action);
        status = tr("message.gameforge_runtime.component_sent", action.displayName(), entry.component().name());
        statusColor = ACCENT;
    }

    private void renderLargeItem(GuiGraphics graphics, ItemStack stack, int x, int y, float scale) {
        graphics.pose().pushPose();
        graphics.pose().translate(x, y, 100);
        graphics.pose().scale(scale, scale, 1f);
        graphics.renderItem(stack, 0, 0);
        graphics.pose().popPose();
    }

    private void drawButton(
        GuiGraphics graphics,
        int mouseX,
        int mouseY,
        int x,
        int y,
        int width,
        int height,
        String label,
        ButtonKind kind,
        Runnable action,
        boolean enabled,
        List<HitBox> target
    ) {
        boolean hovered = enabled && inside(mouseX, mouseY, x, y, width, height);
        int color = enabled ? kind.color : 0xFF303746;
        if (hovered) color = brighten(color);
        graphics.fill(x, y, x + width, y + height, color);
        if (kind == ButtonKind.SECONDARY) {
            graphics.fill(x, y, x + width, y + 1, enabled ? BORDER : 0xFF3B4250);
            graphics.fill(x, y + height - 1, x + width, y + height, enabled ? BORDER : 0xFF3B4250);
        }
        String clipped = this.font.plainSubstrByWidth(label, Math.max(10, width - 10));
        graphics.drawCenteredString(this.font, clipped, x + width / 2, y + (height - 8) / 2, enabled ? kind.textColor : 0xFF777F8D);
        if (enabled) target.add(new HitBox(x, y, width, height, action));
    }

    private int brighten(int color) {
        int alpha = color & 0xFF000000;
        int red = Math.min(255, ((color >> 16) & 0xFF) + 18);
        int green = Math.min(255, ((color >> 8) & 0xFF) + 18);
        int blue = Math.min(255, (color & 0xFF) + 18);
        return alpha | (red << 16) | (green << 8) | blue;
    }

    private Layout layout() {
        int panelW = Math.min(1120, Math.max(620, this.width - 18));
        int panelH = Math.min(650, Math.max(390, this.height - 18));
        panelW = Math.min(panelW, this.width - 10);
        panelH = Math.min(panelH, this.height - 10);
        int panelX = (this.width - panelW) / 2;
        int panelY = (this.height - panelH) / 2;
        int sidebarW = Mth.clamp(panelW / 6, 130, 170);
        return new Layout(panelX, panelY, panelW, panelH, sidebarW, panelX + sidebarW, panelW - sidebarW);
    }

    private static boolean inside(double mouseX, double mouseY, int x, int y, int width, int height) {
        return mouseX >= x && mouseY >= y && mouseX < x + width && mouseY < y + height;
    }

    private static String compactNumber(double value) {
        if (Math.abs(value - Math.rint(value)) < 0.00001) {
            return Long.toString(Math.round(value));
        }
        return String.format(Locale.ROOT, "%.2f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
    }

    private static String tr(String key, Object... args) {
        return I18n.get(key, args);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button == 0) {
            List<HitBox> active = recipeEntry != null ? modalHitBoxes : hitBoxes;
            for (int index = active.size() - 1; index >= 0; index--) {
                HitBox hitBox = active.get(index);
                if (hitBox.contains(mouseX, mouseY)) {
                    hitBox.action.run();
                    return true;
                }
            }
        }
        if (recipeEntry != null) return true;
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double delta) {
        if (recipeEntry != null) return true;
        if (tab == ViewTab.BROWSER && gridBounds.contains(mouseX, mouseY)) {
            gridScrollRows = Math.max(0, gridScrollRows + (delta > 0 ? -1 : 1));
            return true;
        }
        if (tab == ViewTab.PROJECTS && projectBounds.contains(mouseX, mouseY)) {
            projectScroll = Math.max(0, projectScroll + (delta > 0 ? -1 : 1));
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, delta);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (recipeEntry != null && keyCode == 256) {
            recipeEntry = null;
            return true;
        }
        if (keyCode == 256) {
            onClose();
            return true;
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }

    private enum ViewTab {
        BROWSER("screen.gameforge_runtime.browser", "screen.gameforge_runtime.browser_subtitle", "▦"),
        PROJECTS("screen.gameforge_runtime.projects", "screen.gameforge_runtime.projects_subtitle", "◆"),
        DIAGNOSTICS("screen.gameforge_runtime.diagnostics", "screen.gameforge_runtime.diagnostics_subtitle", "✓"),
        HELP("screen.gameforge_runtime.help", "screen.gameforge_runtime.help_subtitle", "?");

        private final String key;
        private final String subtitleKey;
        private final String icon;

        ViewTab(String key, String subtitleKey, String icon) {
            this.key = key;
            this.subtitleKey = subtitleKey;
            this.icon = icon;
        }
    }

    private enum Category {
        ALL("screen.gameforge_runtime.category.all"),
        WEAPON("screen.gameforge_runtime.category.weapon"),
        ITEM("screen.gameforge_runtime.category.item"),
        BLOCK("screen.gameforge_runtime.category.block"),
        ENTITY("screen.gameforge_runtime.category.entity"),
        BOSS("screen.gameforge_runtime.category.boss"),
        RECIPE("screen.gameforge_runtime.category.recipe");

        private final String key;

        Category(String key) {
            this.key = key;
        }

        private boolean matches(GameForgeComponent component) {
            return switch (this) {
                case ALL -> true;
                case WEAPON -> component.normalizedType().equals("weapon");
                case ITEM -> switch (component.normalizedType()) {
                    case "item", "food", "resource_item", "tool", "armor" -> true;
                    default -> false;
                };
                case BLOCK -> component.normalizedType().equals("block") || component.normalizedType().equals("decorative_block");
                case ENTITY -> component.entityLike() && !component.bossLike();
                case BOSS -> component.bossLike();
                case RECIPE -> component.hasRecipe();
            };
        }
    }

    private enum ButtonKind {
        PRIMARY(ACCENT, 0xFF07101F),
        SECONDARY(0xFF263650, TEXT),
        SUCCESS(SUCCESS, 0xFF07101F),
        DANGER(DANGER, 0xFF211015);

        private final int color;
        private final int textColor;

        ButtonKind(int color, int textColor) {
            this.color = color;
            this.textColor = textColor;
        }
    }

    private record ContentEntry(GameForgeProject project, GameForgeComponent component) {
    }

    private record HitBox(int x, int y, int width, int height, Runnable action) {
        private boolean contains(double mouseX, double mouseY) {
            return inside(mouseX, mouseY, x, y, width, height);
        }
    }

    private record Rect(int x, int y, int width, int height) {
        private static final Rect EMPTY = new Rect(0, 0, 0, 0);

        private boolean contains(double mouseX, double mouseY) {
            return inside(mouseX, mouseY, x, y, width, height);
        }
    }

    private record Layout(
        int panelX,
        int panelY,
        int panelW,
        int panelH,
        int sidebarW,
        int contentX,
        int contentW
    ) {
    }
}
