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

/**
 * A compact, high-GUI-scale layout for screens with little logical space.
 *
 * Minecraft GUI scale can reduce a 1600x900 display to roughly 530x300 logical
 * pixels. The full desktop browser is intentionally feature rich, but that
 * layout cannot remain readable at such a small coordinate space. This screen
 * keeps the same Runtime actions while using a JEI-like icon grid, a bottom
 * action strip, and dedicated detail/recipe pages instead of overlapping
 * panels.
 */
public final class CompactGameForgeBrowserScreen extends Screen {
    private static final int BACKGROUND = 0xF2080C17;
    private static final int PANEL = 0xF5111829;
    private static final int PANEL_ALT = 0xF51A2439;
    private static final int CARD = 0xF51D2942;
    private static final int CARD_HOVER = 0xF5263657;
    private static final int BORDER = 0xFF334362;
    private static final int ACCENT = 0xFF80A9FF;
    private static final int PURPLE = 0xFF8C7DFF;
    private static final int TEXT = 0xFFEEF4FF;
    private static final int MUTED = 0xFF9FACBF;
    private static final int SUCCESS = 0xFF77E2AC;
    private static final int WARNING = 0xFFFFD28D;
    private static final int DANGER = 0xFFFF8D9A;

    private final List<HitBox> hitBoxes = new ArrayList<>();

    private List<GameForgeProject> projects = List.of();
    private List<ContentEntry> allEntries = List.of();
    private List<ContentEntry> filteredEntries = List.of();
    private ContentEntry selectedEntry;
    private GameForgeProject selectedProject;
    private Category category = Category.ALL;
    private ViewTab tab = ViewTab.BROWSER;
    private BrowserPage browserPage = BrowserPage.LIST;
    private EditBox searchBox;
    private int gridScrollRows;
    private int projectScroll;
    private Rect scrollBounds = Rect.EMPTY;
    private ItemStack hoveredStack = ItemStack.EMPTY;
    private String status = tr("screen.gameforge_runtime.status.ready");
    private int statusColor = MUTED;

    public CompactGameForgeBrowserScreen() {
        super(Component.translatable("screen.gameforge_runtime.title"));
        refreshProjects();
    }

    @Override
    protected void init() {
        Layout layout = layout();
        searchBox = new EditBox(
            this.font,
            layout.contentX() + 8,
            layout.panelY() + 31,
            Math.max(90, layout.contentW() - 16),
            18,
            Component.translatable("screen.gameforge_runtime.search_content")
        );
        searchBox.setHint(Component.translatable("screen.gameforge_runtime.search_content"));
        searchBox.setMaxLength(100);
        searchBox.setResponder(query -> rebuildFilteredEntries());
        updateSearchVisibility();
        addRenderableWidget(searchBox);
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
        selectedProject = selectedProject == null
            ? (projects.isEmpty() ? null : projects.get(0))
            : projects.stream()
                .filter(project -> project.namespace().equals(selectedProject.namespace()))
                .findFirst()
                .orElse(projects.isEmpty() ? null : projects.get(0));
        rebuildFilteredEntries();
        status = projects.isEmpty()
            ? tr("screen.gameforge_runtime.empty")
            : tr("screen.gameforge_runtime.status.detected", projects.size(), allEntries.size());
        statusColor = projects.isEmpty() ? WARNING : SUCCESS;
    }

    private void rebuildFilteredEntries() {
        String query = searchBox == null ? "" : searchBox.getValue().trim().toLowerCase(Locale.ROOT);
        filteredEntries = allEntries.stream()
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

    private void updateSearchVisibility() {
        if (searchBox == null) return;
        boolean visible = tab == ViewTab.BROWSER && browserPage == BrowserPage.LIST;
        searchBox.setVisible(visible);
        if (!visible) searchBox.setFocused(false);
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        hitBoxes.clear();
        hoveredStack = ItemStack.EMPTY;
        scrollBounds = Rect.EMPTY;

        Layout layout = layout();
        graphics.fill(0, 0, width, height, BACKGROUND);
        graphics.fillGradient(0, 0, width, Math.max(50, height / 3), 0x553E5FCB, 0x00080C17);
        drawShell(graphics, layout);
        drawRail(graphics, mouseX, mouseY, layout);
        drawTopBar(graphics, mouseX, mouseY, layout);

        switch (tab) {
            case BROWSER -> drawBrowser(graphics, mouseX, mouseY, layout);
            case PROJECTS -> drawProjects(graphics, mouseX, mouseY, layout);
            case DIAGNOSTICS -> drawDiagnostics(graphics, mouseX, mouseY, layout);
            case HELP -> drawHelp(graphics, mouseX, mouseY, layout);
        }

        drawFooter(graphics, layout);
        super.render(graphics, mouseX, mouseY, partialTick);

        if (!hoveredStack.isEmpty()) {
            graphics.renderTooltip(font, hoveredStack, mouseX, mouseY);
        }
    }

    private void drawShell(GuiGraphics graphics, Layout layout) {
        graphics.fill(layout.panelX() - 1, layout.panelY() - 1, layout.panelX() + layout.panelW() + 1, layout.panelY() + layout.panelH() + 1, BORDER);
        graphics.fill(layout.panelX(), layout.panelY(), layout.panelX() + layout.panelW(), layout.panelY() + layout.panelH(), PANEL);
        graphics.fill(layout.panelX(), layout.panelY(), layout.panelX() + layout.railW(), layout.panelY() + layout.panelH(), PANEL_ALT);
        graphics.fill(layout.panelX() + layout.railW() - 1, layout.panelY(), layout.panelX() + layout.railW(), layout.panelY() + layout.panelH(), BORDER);
    }

    private void drawRail(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int logoX = layout.panelX() + 8;
        int logoY = layout.panelY() + 8;
        graphics.fill(logoX, logoY, logoX + 26, logoY + 26, PURPLE);
        graphics.fill(logoX + 2, logoY + 2, logoX + 24, logoY + 24, 0xFF111829);
        graphics.drawCenteredString(font, "GF", logoX + 13, logoY + 9, ACCENT);
        graphics.drawString(font, "0.2.1", logoX + 31, logoY + 10, ACCENT, false);

        int y = layout.panelY() + 43;
        for (ViewTab candidate : ViewTab.values()) {
            int x = layout.panelX() + 5;
            int buttonW = layout.railW() - 10;
            boolean active = tab == candidate;
            boolean hovered = inside(mouseX, mouseY, x, y, buttonW, 29);
            graphics.fill(x, y, x + buttonW, y + 29, active ? 0xFF263A62 : hovered ? 0xFF202F4D : 0x00111829);
            if (active) graphics.fill(x, y, x + 3, y + 29, ACCENT);
            graphics.drawString(font, candidate.icon, x + 7, y + 10, active ? ACCENT : MUTED, false);
            String label = compactTabLabel(candidate);
            graphics.drawString(font, label, x + 23, y + 10, active ? TEXT : MUTED, false);
            hitBoxes.add(new HitBox(x, y, buttonW, 29, () -> switchTab(candidate)));
            y += 33;
        }

        drawButton(
            graphics,
            mouseX,
            mouseY,
            layout.panelX() + 6,
            layout.panelY() + layout.panelH() - 34,
            layout.railW() - 12,
            25,
            tr("screen.gameforge_runtime.close"),
            ButtonKind.SECONDARY,
            this::onClose,
            true
        );
    }

    private String compactTabLabel(ViewTab candidate) {
        return switch (candidate) {
            case BROWSER -> tr("screen.gameforge_runtime.browser");
            case PROJECTS -> tr("screen.gameforge_runtime.projects");
            case DIAGNOSTICS -> tr("screen.gameforge_runtime.doctor_short");
            case HELP -> tr("screen.gameforge_runtime.help");
        };
    }

    private void drawTopBar(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        String title = switch (tab) {
            case BROWSER -> browserPage == BrowserPage.LIST
                ? tr("screen.gameforge_runtime.browser")
                : selectedEntry == null ? tr("screen.gameforge_runtime.browser") : selectedEntry.component().name();
            case PROJECTS -> tr("screen.gameforge_runtime.projects");
            case DIAGNOSTICS -> tr("screen.gameforge_runtime.diagnostics");
            case HELP -> tr("screen.gameforge_runtime.help");
        };
        graphics.drawString(font, font.plainSubstrByWidth(title, Math.max(80, layout.contentW() - 80)), layout.contentX() + 8, layout.panelY() + 11, TEXT, false);

        if (tab == ViewTab.BROWSER && browserPage != BrowserPage.LIST) {
            drawButton(
                graphics,
                mouseX,
                mouseY,
                layout.contentX() + layout.contentW() - 57,
                layout.panelY() + 6,
                49,
                22,
                "← " + tr("screen.gameforge_runtime.category.all"),
                ButtonKind.SECONDARY,
                () -> {
                    browserPage = BrowserPage.LIST;
                    updateSearchVisibility();
                },
                true
            );
        } else if (tab != ViewTab.BROWSER) {
            drawButton(
                graphics,
                mouseX,
                mouseY,
                layout.contentX() + layout.contentW() - 57,
                layout.panelY() + 6,
                49,
                22,
                tr("screen.gameforge_runtime.refresh"),
                ButtonKind.SECONDARY,
                this::refreshProjects,
                true
            );
        }

        graphics.fill(layout.contentX() + 6, layout.panelY() + 53, layout.panelX() + layout.panelW() - 6, layout.panelY() + 54, BORDER);
    }

    private void drawBrowser(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        switch (browserPage) {
            case LIST -> drawBrowserList(graphics, mouseX, mouseY, layout);
            case DETAILS -> drawBrowserDetails(graphics, mouseX, mouseY, layout);
            case RECIPE -> drawRecipe(graphics, mouseX, mouseY, layout);
        }
    }

    private void drawBrowserList(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int categoryY = layout.panelY() + 57;
        int x = layout.contentX() + 7;
        int available = layout.contentW() - 14;
        int gap = 3;
        int buttonW = Math.max(31, (available - gap * (Category.values().length - 1)) / Category.values().length);
        for (Category candidate : Category.values()) {
            drawButton(
                graphics,
                mouseX,
                mouseY,
                x,
                categoryY,
                buttonW,
                19,
                categoryLabel(candidate),
                category == candidate ? ButtonKind.PRIMARY : ButtonKind.SECONDARY,
                () -> {
                    category = candidate;
                    rebuildFilteredEntries();
                },
                true
            );
            x += buttonW + gap;
        }

        int bodyTop = categoryY + 23;
        int footerTop = layout.panelY() + layout.panelH() - 22;
        int selectedBarH = selectedEntry == null ? 0 : 48;
        int gridBottom = footerTop - selectedBarH - (selectedBarH > 0 ? 4 : 0);
        int gridX = layout.contentX() + 7;
        int gridW = layout.contentW() - 14;
        int gridH = Math.max(40, gridBottom - bodyTop);
        graphics.fill(gridX, bodyTop, gridX + gridW, bodyTop + gridH, 0x99101829);
        scrollBounds = new Rect(gridX, bodyTop, gridW, gridH);
        drawIconGrid(graphics, mouseX, mouseY, gridX, bodyTop, gridW, gridH);

        if (selectedEntry != null) {
            drawSelectedBar(graphics, mouseX, mouseY, layout, footerTop - selectedBarH, selectedBarH);
        }
    }

    private String categoryLabel(Category candidate) {
        return switch (candidate) {
            case ALL -> tr("screen.gameforge_runtime.category.all");
            case WEAPON -> tr("screen.gameforge_runtime.category.weapon");
            case ITEM -> tr("screen.gameforge_runtime.category.item");
            case BLOCK -> tr("screen.gameforge_runtime.category.block");
            case ENTITY -> tr("screen.gameforge_runtime.category.entity");
            case BOSS -> "Boss";
            case RECIPE -> tr("screen.gameforge_runtime.category.recipe");
        };
    }

    private void drawIconGrid(GuiGraphics graphics, int mouseX, int mouseY, int x, int y, int width, int height) {
        if (filteredEntries.isEmpty()) {
            graphics.drawCenteredString(font, tr("screen.gameforge_runtime.no_content"), x + width / 2, y + 22, TEXT);
            graphics.drawCenteredString(font, tr("screen.gameforge_runtime.no_content_hint"), x + width / 2, y + 40, MUTED);
            return;
        }

        int cell = 34;
        int columns = Math.max(3, (width - 8) / cell);
        int visibleRows = Math.max(1, (height - 8) / cell);
        int totalRows = (filteredEntries.size() + columns - 1) / columns;
        int maxRows = Math.max(0, totalRows - visibleRows);
        gridScrollRows = Mth.clamp(gridScrollRows, 0, maxRows);
        int start = gridScrollRows * columns;
        int end = Math.min(filteredEntries.size(), start + visibleRows * columns);

        graphics.enableScissor(x, y, x + width, y + height);
        for (int index = start; index < end; index++) {
            int local = index - start;
            int col = local % columns;
            int row = local / columns;
            int cellX = x + 5 + col * cell;
            int cellY = y + 5 + row * cell;
            ContentEntry entry = filteredEntries.get(index);
            boolean selected = entry.equals(selectedEntry);
            boolean hovered = inside(mouseX, mouseY, cellX, cellY, cell - 3, cell - 3);
            graphics.fill(cellX, cellY, cellX + cell - 3, cellY + cell - 3, selected ? 0xFF263A62 : hovered ? CARD_HOVER : CARD);
            if (selected) {
                graphics.fill(cellX, cellY, cellX + cell - 3, cellY + 2, ACCENT);
                graphics.fill(cellX, cellY, cellX + 2, cellY + cell - 3, PURPLE);
            }
            ItemStack stack = GameForgeItemFactory.componentStack(entry.project(), entry.component());
            renderItem(graphics, stack, cellX + 6, cellY + 6, 1.15f);
            if (hovered) hoveredStack = stack;
            hitBoxes.add(new HitBox(cellX, cellY, cell - 3, cell - 3, () -> {
                selectedEntry = entry;
                selectedProject = entry.project();
                status = tr("screen.gameforge_runtime.status.selected", entry.component().name());
                statusColor = ACCENT;
            }));
        }
        graphics.disableScissor();

        if (totalRows > visibleRows) {
            int trackX = x + width - 3;
            int trackY = y + 4;
            int trackH = height - 8;
            int thumbH = Math.max(12, trackH * visibleRows / totalRows);
            int thumbY = trackY + (trackH - thumbH) * gridScrollRows / Math.max(1, maxRows);
            graphics.fill(trackX, trackY, trackX + 2, trackY + trackH, 0x552E3B55);
            graphics.fill(trackX, thumbY, trackX + 2, thumbY + thumbH, ACCENT);
        }
    }

    private void drawSelectedBar(GuiGraphics graphics, int mouseX, int mouseY, Layout layout, int y, int height) {
        ContentEntry entry = selectedEntry;
        if (entry == null) return;
        int x = layout.contentX() + 7;
        int width = layout.contentW() - 14;
        graphics.fill(x, y, x + width, y + height, 0xEE141D30);
        graphics.fill(x, y, x + width, y + 2, PURPLE);

        ItemStack stack = GameForgeItemFactory.componentStack(entry.project(), entry.component());
        renderItem(graphics, stack, x + 7, y + 9, 1.45f);
        if (inside(mouseX, mouseY, x + 4, y + 4, 34, 38)) hoveredStack = stack;
        int textX = x + 39;
        int actionArea = Math.min(190, width / 2);
        int textWidth = Math.max(50, width - actionArea - 48);
        graphics.drawString(font, font.plainSubstrByWidth(entry.component().name(), textWidth), textX, y + 10, TEXT, false);
        graphics.drawString(font, font.plainSubstrByWidth(entry.project().namespace() + ":" + entry.component().logicalId(), textWidth), textX, y + 25, MUTED, false);

        int buttonGap = 4;
        int buttonW = Math.max(42, (actionArea - buttonGap * 2) / 3);
        int buttonX = x + width - actionArea;
        boolean canAct = entry.component().itemLike() || entry.component().entityLike();
        String actionLabel = entry.component().entityLike()
            ? tr("screen.gameforge_runtime.spawn_one")
            : tr("screen.gameforge_runtime.get_one");
        drawButton(graphics, mouseX, mouseY, buttonX, y + 10, buttonW, 28, shortActionLabel(actionLabel), ButtonKind.PRIMARY, () -> runComponentAction(entry.component().entityLike() ? ComponentAction.SPAWN : ComponentAction.GIVE), canAct);
        drawButton(graphics, mouseX, mouseY, buttonX + buttonW + buttonGap, y + 10, buttonW, 28, tr("screen.gameforge_runtime.view_recipe"), ButtonKind.SUCCESS, () -> {
            browserPage = BrowserPage.RECIPE;
            updateSearchVisibility();
        }, entry.component().hasRecipe());
        drawButton(graphics, mouseX, mouseY, buttonX + (buttonW + buttonGap) * 2, y + 10, buttonW, 28, "详情", ButtonKind.SECONDARY, () -> {
            browserPage = BrowserPage.DETAILS;
            updateSearchVisibility();
        }, true);
    }

    private String shortActionLabel(String label) {
        if (label.contains("召唤")) return "召唤";
        if (label.contains("获取")) return "获取";
        return label;
    }

    private void drawBrowserDetails(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        if (selectedEntry == null) {
            browserPage = BrowserPage.LIST;
            updateSearchVisibility();
            return;
        }
        ContentEntry entry = selectedEntry;
        GameForgeComponent component = entry.component();
        int x = layout.contentX() + 8;
        int y = layout.panelY() + 58;
        int width = layout.contentW() - 16;
        int bottom = layout.panelY() + layout.panelH() - 24;
        int height = bottom - y;
        graphics.fill(x, y, x + width, bottom, 0x99141D30);
        graphics.fill(x, y, x + width, y + 3, PURPLE);

        ItemStack stack = GameForgeItemFactory.componentStack(entry.project(), component);
        renderItem(graphics, stack, x + 10, y + 11, 1.75f);
        if (inside(mouseX, mouseY, x + 5, y + 6, 40, 40)) hoveredStack = stack;
        graphics.drawString(font, font.plainSubstrByWidth(component.name(), width - 58), x + 49, y + 12, TEXT, false);
        graphics.drawString(font, GameForgeItemFactory.typeLabel(component) + " · " + entry.project().name(), x + 49, y + 27, ACCENT, false);
        graphics.drawString(font, font.plainSubstrByWidth(entry.project().namespace() + ":" + component.logicalId(), width - 20), x + 10, y + 48, MUTED, false);

        List<String> stats = componentStats(component);
        int statsTop = y + 67;
        int columnGap = 10;
        int columnW = (width - 20 - columnGap) / 2;
        int rows = Math.min(6, (stats.size() + 1) / 2);
        for (int index = 0; index < Math.min(stats.size(), 12); index++) {
            int col = index / Math.max(1, rows);
            int row = index % Math.max(1, rows);
            int statX = x + 10 + col * (columnW + columnGap);
            int statY = statsTop + row * 14;
            graphics.drawString(font, "• " + font.plainSubstrByWidth(stats.get(index), columnW - 6), statX, statY, 0xFFC7D4E8, false);
        }

        int actionY = bottom - 63;
        int gap = 5;
        int quarter = Math.max(45, (width - 20 - gap * 3) / 4);
        boolean canAct = component.itemLike() || component.entityLike();
        drawButton(graphics, mouseX, mouseY, x + 10, actionY, quarter, 26, component.entityLike() ? "召唤" : "获取", ButtonKind.PRIMARY, () -> runComponentAction(component.entityLike() ? ComponentAction.SPAWN : ComponentAction.GIVE), canAct);
        drawButton(graphics, mouseX, mouseY, x + 10 + (quarter + gap), actionY, quarter, 26, tr("screen.gameforge_runtime.view_recipe"), ButtonKind.SUCCESS, () -> {
            browserPage = BrowserPage.RECIPE;
            updateSearchVisibility();
        }, component.hasRecipe());
        drawButton(graphics, mouseX, mouseY, x + 10 + (quarter + gap) * 2, actionY, quarter, 26, tr("screen.gameforge_runtime.project_menu_short"), ButtonKind.SECONDARY, () -> runProjectAction(ProjectAction.MENU, entry.project()), true);
        drawButton(graphics, mouseX, mouseY, x + 10 + (quarter + gap) * 3, actionY, quarter, 26, tr("screen.gameforge_runtime.doctor_short"), ButtonKind.SECONDARY, () -> runProjectAction(ProjectAction.DOCTOR, entry.project()), true);
        drawButton(graphics, mouseX, mouseY, x + 10, actionY + 31, width - 20, 24, "返回内容列表", ButtonKind.SECONDARY, () -> {
            browserPage = BrowserPage.LIST;
            updateSearchVisibility();
        }, true);
    }

    private void drawRecipe(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        if (selectedEntry == null || !selectedEntry.component().hasRecipe()) {
            browserPage = BrowserPage.LIST;
            updateSearchVisibility();
            return;
        }
        ContentEntry entry = selectedEntry;
        GameForgeComponent component = entry.component();
        int x = layout.contentX() + 8;
        int y = layout.panelY() + 58;
        int width = layout.contentW() - 16;
        int bottom = layout.panelY() + layout.panelH() - 24;
        graphics.fill(x, y, x + width, bottom, 0x99141D30);
        graphics.fill(x, y, x + width, y + 3, PURPLE);

        int slot = 29;
        int gap = 3;
        int gridW = slot * 3 + gap * 2;
        int gridX = x + 12;
        int gridY = y + 18;
        List<String> recipe = component.recipeGrid();
        for (int index = 0; index < 9; index++) {
            int col = index % 3;
            int row = index / 3;
            int slotX = gridX + col * (slot + gap);
            int slotY = gridY + row * (slot + gap);
            graphics.fill(slotX, slotY, slotX + slot, slotY + slot, 0xFF0D1423);
            graphics.fill(slotX + 1, slotY + 1, slotX + slot - 1, slotY + slot - 1, 0xFF1A2439);
            ItemStack ingredient = index < recipe.size() ? GameForgeItemFactory.ingredientStack(recipe.get(index)) : ItemStack.EMPTY;
            if (!ingredient.isEmpty()) {
                renderItem(graphics, ingredient, slotX + 5, slotY + 5, 1.12f);
                if (inside(mouseX, mouseY, slotX, slotY, slot, slot)) hoveredStack = ingredient;
            }
        }

        int arrowX = gridX + gridW + 14;
        int outputX = arrowX + 25;
        int outputY = gridY + 31;
        graphics.drawCenteredString(font, "→", arrowX + 5, outputY + 8, ACCENT);
        graphics.fill(outputX, outputY, outputX + 40, outputY + 40, 0xFF263A62);
        ItemStack output = GameForgeItemFactory.componentStack(entry.project(), component);
        renderItem(graphics, output, outputX + 8, outputY + 8, 1.45f);
        if (inside(mouseX, mouseY, outputX, outputY, 40, 40)) hoveredStack = output;

        int infoX = outputX + 51;
        int infoW = Math.max(70, x + width - infoX - 10);
        graphics.drawString(font, font.plainSubstrByWidth(component.name(), infoW), infoX, gridY + 5, TEXT, false);
        graphics.drawString(font, font.plainSubstrByWidth(entry.project().name(), infoW), infoX, gridY + 20, ACCENT, false);
        graphics.drawString(font, font.plainSubstrByWidth(entry.project().namespace() + ":" + component.logicalId(), infoW), infoX, gridY + 35, MUTED, false);
        graphics.drawString(font, tr("screen.gameforge_runtime.recipe_note"), infoX, gridY + 55, WARNING, false);
        int noteY = gridY + 69;
        for (FormattedCharSequence line : font.split(Component.translatable("screen.gameforge_runtime.recipe_note_detail"), infoW)) {
            graphics.drawString(font, line, infoX, noteY, MUTED);
            noteY += 10;
            if (noteY > bottom - 68) break;
        }

        int actionY = bottom - 57;
        int half = (width - 25) / 2;
        drawButton(graphics, mouseX, mouseY, x + 10, actionY, half, 25, tr("screen.gameforge_runtime.get_one"), ButtonKind.PRIMARY, () -> runComponentAction(ComponentAction.GIVE), component.itemLike());
        drawButton(graphics, mouseX, mouseY, x + 15 + half, actionY, half, 25, "查看详情", ButtonKind.SUCCESS, () -> {
            browserPage = BrowserPage.DETAILS;
            updateSearchVisibility();
        }, true);
        drawButton(graphics, mouseX, mouseY, x + 10, actionY + 30, width - 20, 22, "返回内容列表", ButtonKind.SECONDARY, () -> {
            browserPage = BrowserPage.LIST;
            updateSearchVisibility();
        }, true);
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
        if (!component.effect().isBlank() && !component.effect().equalsIgnoreCase("none")) stats.add(tr("screen.gameforge_runtime.stat.effect", GameForgeItemFactory.effectLabel(component.effect())));
        if (component.cooldown() > 0) stats.add(tr("screen.gameforge_runtime.stat.cooldown", component.cooldown()));
        if (component.range() > 0) stats.add(tr("screen.gameforge_runtime.stat.range", component.range()));
        if (component.power() > 0) stats.add(tr("screen.gameforge_runtime.stat.power", component.power()));
        if (component.glow()) stats.add(tr("screen.gameforge_runtime.stat.glow"));
        if (component.unbreakable()) stats.add(tr("screen.gameforge_runtime.stat.unbreakable"));
        if (component.hasRecipe()) stats.add(tr("screen.gameforge_runtime.stat.recipe"));
        return stats;
    }

    private void drawProjects(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int x = layout.contentX() + 8;
        int y = layout.panelY() + 58;
        int width = layout.contentW() - 16;
        int bottom = layout.panelY() + layout.panelH() - 24;
        int actionH = selectedProject == null ? 0 : 51;
        int listBottom = bottom - actionH - (actionH > 0 ? 4 : 0);
        graphics.fill(x, y, x + width, listBottom, 0x99101829);
        scrollBounds = new Rect(x, y, width, Math.max(0, listBottom - y));

        if (projects.isEmpty()) {
            graphics.drawCenteredString(font, tr("screen.gameforge_runtime.empty"), x + width / 2, y + 28, TEXT);
            return;
        }

        int cardH = 38;
        int visible = Math.max(1, (listBottom - y - 6) / cardH);
        int maxScroll = Math.max(0, projects.size() - visible);
        projectScroll = Mth.clamp(projectScroll, 0, maxScroll);
        int cardY = y + 4;
        for (int index = projectScroll; index < Math.min(projects.size(), projectScroll + visible); index++) {
            GameForgeProject project = projects.get(index);
            boolean active = selectedProject != null && project.namespace().equals(selectedProject.namespace());
            boolean hovered = inside(mouseX, mouseY, x + 4, cardY, width - 8, cardH - 3);
            graphics.fill(x + 4, cardY, x + width - 4, cardY + cardH - 3, active ? 0xFF263A62 : hovered ? CARD_HOVER : CARD);
            if (active) graphics.fill(x + 4, cardY, x + 7, cardY + cardH - 3, ACCENT);
            graphics.drawString(font, font.plainSubstrByWidth(project.name(), width - 90), x + 13, cardY + 7, TEXT, false);
            graphics.drawString(font, project.namespace(), x + 13, cardY + 21, ACCENT, false);
            String summary = project.compactSummary();
            graphics.drawString(font, summary, x + width - font.width(summary) - 12, cardY + 14, MUTED, false);
            hitBoxes.add(new HitBox(x + 4, cardY, width - 8, cardH - 3, () -> selectedProject = project));
            cardY += cardH;
        }

        if (selectedProject != null) {
            int actionY = bottom - actionH;
            graphics.fill(x, actionY, x + width, bottom, 0xEE141D30);
            graphics.drawString(font, font.plainSubstrByWidth(selectedProject.name(), width - 205), x + 8, actionY + 8, TEXT, false);
            graphics.drawString(font, selectedProject.namespace(), x + 8, actionY + 24, ACCENT, false);
            int actionArea = Math.min(195, width / 2);
            int gap = 4;
            int buttonW = (actionArea - gap * 2) / 3;
            int buttonX = x + width - actionArea;
            drawButton(graphics, mouseX, mouseY, buttonX, actionY + 10, buttonW, 28, tr("screen.gameforge_runtime.project_menu_short"), ButtonKind.PRIMARY, () -> runProjectAction(ProjectAction.MENU, selectedProject), true);
            drawButton(graphics, mouseX, mouseY, buttonX + buttonW + gap, actionY + 10, buttonW, 28, tr("screen.gameforge_runtime.get_all_short"), ButtonKind.SECONDARY, () -> runProjectAction(ProjectAction.GET_ALL, selectedProject), true);
            drawButton(graphics, mouseX, mouseY, buttonX + (buttonW + gap) * 2, actionY + 10, buttonW, 28, tr("screen.gameforge_runtime.doctor_short"), ButtonKind.SUCCESS, () -> runProjectAction(ProjectAction.DOCTOR, selectedProject), true);
        }
    }

    private void drawDiagnostics(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int x = layout.contentX() + 8;
        int y = layout.panelY() + 58;
        int width = layout.contentW() - 16;
        int bottom = layout.panelY() + layout.panelH() - 24;
        graphics.fill(x, y, x + width, bottom, 0x99141D30);

        int gap = 5;
        int metricW = (width - gap * 2) / 3;
        drawMetric(graphics, x, y, metricW, tr("screen.gameforge_runtime.metric.projects"), Integer.toString(projects.size()), SUCCESS);
        drawMetric(graphics, x + metricW + gap, y, metricW, tr("screen.gameforge_runtime.metric.components"), Integer.toString(allEntries.size()), ACCENT);
        drawMetric(graphics, x + (metricW + gap) * 2, y, metricW, tr("screen.gameforge_runtime.metric.recipes"), Long.toString(allEntries.stream().filter(entry -> entry.component().hasRecipe()).count()), PURPLE);

        int checkY = y + 45;
        drawCheck(graphics, x + 6, checkY, true, tr("screen.gameforge_runtime.check.minecraft"));
        checkY += 20;
        drawCheck(graphics, x + 6, checkY, true, tr("screen.gameforge_runtime.check.forge"));
        checkY += 20;
        drawCheck(graphics, x + 6, checkY, true, tr("screen.gameforge_runtime.check.runtime", GameForgeRuntime.VERSION));
        checkY += 20;
        drawCheck(graphics, x + 6, checkY, !projects.isEmpty(), projects.isEmpty() ? tr("screen.gameforge_runtime.check.no_projects") : tr("screen.gameforge_runtime.check.projects", projects.size()));
        checkY += 20;
        Set<String> duplicates = duplicateNamespaces();
        drawCheck(graphics, x + 6, checkY, duplicates.isEmpty(), duplicates.isEmpty() ? tr("screen.gameforge_runtime.check.no_duplicates") : tr("screen.gameforge_runtime.check.duplicates", String.join(", ", duplicates)));

        int buttonY = bottom - 31;
        int half = (width - 15) / 2;
        drawButton(graphics, mouseX, mouseY, x + 5, buttonY, half, 25, tr("screen.gameforge_runtime.refresh"), ButtonKind.PRIMARY, this::refreshProjects, true);
        drawButton(graphics, mouseX, mouseY, x + 10 + half, buttonY, half, 25, tr("screen.gameforge_runtime.doctor"), ButtonKind.SUCCESS, () -> runProjectAction(ProjectAction.DOCTOR, selectedProject), selectedProject != null);
    }

    private void drawMetric(GuiGraphics graphics, int x, int y, int width, String label, String value, int color) {
        graphics.fill(x, y, x + width, y + 38, CARD);
        graphics.fill(x, y, x + 3, y + 38, color);
        graphics.drawString(font, font.plainSubstrByWidth(label, width - 12), x + 8, y + 7, MUTED, false);
        graphics.drawString(font, value, x + 8, y + 21, color, false);
    }

    private void drawCheck(GuiGraphics graphics, int x, int y, boolean okay, String text) {
        graphics.fill(x, y, x + 15, y + 15, okay ? SUCCESS : DANGER);
        graphics.drawCenteredString(font, okay ? "✓" : "!", x + 7, y + 4, 0xFF07101F);
        graphics.drawString(font, font.plainSubstrByWidth(text, Math.max(80, width - x - 18)), x + 21, y + 4, okay ? 0xFFCFE8DB : 0xFFFFBCC4, false);
    }

    private Set<String> duplicateNamespaces() {
        Set<String> seen = new HashSet<>();
        Set<String> duplicates = new HashSet<>();
        for (GameForgeProject project : projects) {
            if (!seen.add(project.namespace())) duplicates.add(project.namespace());
        }
        return duplicates;
    }

    private void drawHelp(GuiGraphics graphics, int mouseX, int mouseY, Layout layout) {
        int x = layout.contentX() + 8;
        int y = layout.panelY() + 58;
        int width = layout.contentW() - 16;
        int bottom = layout.panelY() + layout.panelH() - 24;
        graphics.fill(x, y, x + width, bottom, 0x99141D30);

        int lineY = y + 8;
        List<String> lines = List.of(
            tr("screen.gameforge_runtime.help_1"),
            tr("screen.gameforge_runtime.help_2"),
            tr("screen.gameforge_runtime.help_3"),
            tr("screen.gameforge_runtime.help_4"),
            tr("screen.gameforge_runtime.help_5")
        );
        for (String line : lines) {
            graphics.fill(x + 5, lineY, x + width - 5, lineY + 31, CARD);
            graphics.fill(x + 5, lineY, x + 8, lineY + 31, ACCENT);
            int textY = lineY + 6;
            for (FormattedCharSequence wrapped : font.split(Component.literal(line), width - 26)) {
                graphics.drawString(font, wrapped, x + 14, textY, 0xFFC7D4E8);
                textY += 10;
                if (textY > lineY + 24) break;
            }
            lineY += 35;
            if (lineY + 31 > bottom - 30) break;
        }

        drawButton(graphics, mouseX, mouseY, x + 5, bottom - 29, width - 10, 24, tr("screen.gameforge_runtime.open_browser"), ButtonKind.PRIMARY, () -> switchTab(ViewTab.BROWSER), true);
    }

    private void drawFooter(GuiGraphics graphics, Layout layout) {
        int y = layout.panelY() + layout.panelH() - 20;
        graphics.fill(layout.contentX(), y, layout.panelX() + layout.panelW(), layout.panelY() + layout.panelH(), 0xCC0D1423);
        String version = "GF " + GameForgeRuntime.VERSION.substring(GameForgeRuntime.VERSION.lastIndexOf('-') + 1);
        int versionW = font.width(version);
        int statusW = Math.max(50, layout.contentW() - versionW - 28);
        graphics.drawString(font, font.plainSubstrByWidth(status, statusW), layout.contentX() + 8, y + 6, statusColor, false);
        graphics.drawString(font, version, layout.panelX() + layout.panelW() - versionW - 8, y + 6, MUTED, false);
    }

    private void switchTab(ViewTab newTab) {
        tab = newTab;
        browserPage = BrowserPage.LIST;
        updateSearchVisibility();
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
        if (selectedEntry == null) return;
        GameForgeRuntime.sendComponentAction(selectedEntry.project().namespace(), selectedEntry.component().logicalId(), action);
        status = tr("message.gameforge_runtime.component_sent", action.displayName(), selectedEntry.component().name());
        statusColor = ACCENT;
    }

    private void renderItem(GuiGraphics graphics, ItemStack stack, int x, int y, float scale) {
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
        boolean enabled
    ) {
        if (width <= 0 || height <= 0) return;
        boolean hovered = enabled && inside(mouseX, mouseY, x, y, width, height);
        int color = enabled ? kind.color : 0xFF303746;
        if (hovered) color = brighten(color);
        graphics.fill(x, y, x + width, y + height, color);
        if (kind == ButtonKind.SECONDARY) {
            graphics.fill(x, y, x + width, y + 1, enabled ? BORDER : 0xFF3B4250);
            graphics.fill(x, y + height - 1, x + width, y + height, enabled ? BORDER : 0xFF3B4250);
        }
        String clipped = font.plainSubstrByWidth(label, Math.max(8, width - 6));
        graphics.drawCenteredString(font, clipped, x + width / 2, y + Math.max(1, (height - 8) / 2), enabled ? kind.textColor : 0xFF777F8D);
        if (enabled) hitBoxes.add(new HitBox(x, y, width, height, action));
    }

    private int brighten(int color) {
        int alpha = color & 0xFF000000;
        int red = Math.min(255, ((color >> 16) & 0xFF) + 18);
        int green = Math.min(255, ((color >> 8) & 0xFF) + 18);
        int blue = Math.min(255, (color & 0xFF) + 18);
        return alpha | (red << 16) | (green << 8) | blue;
    }

    private Layout layout() {
        int margin = 4;
        int panelX = margin;
        int panelY = margin;
        int panelW = Math.max(320, width - margin * 2);
        int panelH = Math.max(220, height - margin * 2);
        panelW = Math.min(panelW, width - 2);
        panelH = Math.min(panelH, height - 2);
        panelX = (width - panelW) / 2;
        panelY = (height - panelH) / 2;
        int railW = Mth.clamp(panelW / 5, 84, 108);
        return new Layout(panelX, panelY, panelW, panelH, railW, panelX + railW, panelW - railW);
    }

    private static boolean inside(double mouseX, double mouseY, int x, int y, int width, int height) {
        return mouseX >= x && mouseY >= y && mouseX < x + width && mouseY < y + height;
    }

    private static String compactNumber(double value) {
        if (Math.abs(value - Math.rint(value)) < 0.00001) return Long.toString(Math.round(value));
        return String.format(Locale.ROOT, "%.2f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
    }

    private static String tr(String key, Object... args) {
        return I18n.get(key, args);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button == 0) {
            for (int index = hitBoxes.size() - 1; index >= 0; index--) {
                HitBox hitBox = hitBoxes.get(index);
                if (hitBox.contains(mouseX, mouseY)) {
                    hitBox.action().run();
                    return true;
                }
            }
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double delta) {
        if (scrollBounds.contains(mouseX, mouseY)) {
            if (tab == ViewTab.BROWSER && browserPage == BrowserPage.LIST) {
                gridScrollRows = Math.max(0, gridScrollRows + (delta > 0 ? -1 : 1));
            } else if (tab == ViewTab.PROJECTS) {
                projectScroll = Math.max(0, projectScroll + (delta > 0 ? -1 : 1));
            }
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, delta);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (keyCode == 256 && tab == ViewTab.BROWSER && browserPage != BrowserPage.LIST) {
            browserPage = BrowserPage.LIST;
            updateSearchVisibility();
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
        BROWSER("▦"), PROJECTS("◆"), DIAGNOSTICS("✓"), HELP("?");
        private final String icon;
        ViewTab(String icon) { this.icon = icon; }
    }

    private enum BrowserPage {
        LIST, DETAILS, RECIPE
    }

    private enum Category {
        ALL, WEAPON, ITEM, BLOCK, ENTITY, BOSS, RECIPE;

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
        SUCCESS(CompactGameForgeBrowserScreen.SUCCESS, 0xFF07101F),
        DANGER(CompactGameForgeBrowserScreen.DANGER, 0xFF211015);

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

    private record Layout(int panelX, int panelY, int panelW, int panelH, int railW, int contentX, int contentW) {
    }
}
